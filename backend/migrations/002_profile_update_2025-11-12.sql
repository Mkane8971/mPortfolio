/*
  Azure SQL update script
  - Removes Biomedical Services Scheduling (Volunteer) from experience
  - Updates AzHIMA project role to "Membership Chairperson"
  - Appends Google IT Support Certification (2025) to education
  - Adds simple AI skills to skills array
  - Also sets full_name, title, and summary as provided
*/

SET NOCOUNT ON;
BEGIN TRY
  BEGIN TRAN;

  DECLARE 
    @full_name NVARCHAR(255) = N'Matthew Kane',
    @title NVARCHAR(255) = N'RHIA | RCM & HIM Software Engineer',
    @summary NVARCHAR(MAX) = N'I’m a Health Information Management and Revenue Cycle specialist turned software engineer. I optimize clinical documentation, claims quality, interoperability, and billing workflows utilizing my skills in data rigor, compliance insight, and engineering to deliver accurate, efficient systems.',
    @skills NVARCHAR(MAX),
    @experience NVARCHAR(MAX),
    @education NVARCHAR(MAX),
    @projects NVARCHAR(MAX);

  SELECT 
    @skills = ISNULL(CAST(skills AS NVARCHAR(MAX)), N'[]'),
    @experience = ISNULL(CAST(experience AS NVARCHAR(MAX)), N'[]'),
    @education = ISNULL(CAST(education AS NVARCHAR(MAX)), N'[]'),
    @projects = ISNULL(CAST(projects AS NVARCHAR(MAX)), N'[]')
  FROM dbo.portfolio_profile WHERE id = 1;

  -- Normalize nulls to empty arrays if needed
  IF (ISJSON(@skills) <> 1) SET @skills = N'[]';
  IF (ISJSON(@experience) <> 1) SET @experience = N'[]';
  IF (ISJSON(@education) <> 1) SET @education = N'[]';
  IF (ISJSON(@projects) <> 1) SET @projects = N'[]';

  /* 1) Remove Biomedical Services Scheduling (Volunteer) experience */
  ;WITH exp AS (
    SELECT 
      role,
      company,
      period,
      highlights = JSON_QUERY(highlights)
    FROM OPENJSON(@experience)
    WITH (
      role NVARCHAR(300)     '$.role',
      company NVARCHAR(300)  '$.company',
      period NVARCHAR(100)   '$.period',
      highlights NVARCHAR(MAX) '$.highlights' AS JSON
    )
    WHERE ISNULL(role,'') <> 'Biomedical Services Scheduling (Volunteer)'
  )
  SELECT @experience = (SELECT role, company, period, highlights FROM exp FOR JSON PATH);

  /* 2) Update AzHIMA project role to "Membership Chairperson" */
  ;WITH prj AS (
    SELECT 
      name,
      role = CASE WHEN name = 'AzHIMA Membership Analytics' THEN 'Membership Chairperson' ELSE role END,
      stack = JSON_QUERY(stack),
      description
    FROM OPENJSON(@projects)
    WITH (
      name NVARCHAR(300)       '$.name',
      role NVARCHAR(300)       '$.role',
      stack NVARCHAR(MAX)      '$.stack' AS JSON,
      description NVARCHAR(MAX) '$.description'
    )
  )
  SELECT @projects = (SELECT name, role, stack, description FROM prj FOR JSON PATH);

  /* 3) Append Google IT Support Certification (2025) to education if missing */
  DECLARE @newEdu NVARCHAR(MAX) = N'{"program":"Google IT Support (Professional Certificate)","institution":"Google","completion":"2025"}';
  IF NOT EXISTS (
    SELECT 1 FROM OPENJSON(@education)
    WITH (program NVARCHAR(400) '$.program')
    WHERE program LIKE 'Google IT Support%'
  )
  BEGIN
    SET @education = JSON_MODIFY(@education, 'append $', JSON_QUERY(@newEdu));
  END

  /* 4) Add simple AI skills */
  IF NOT EXISTS (SELECT 1 FROM OPENJSON(@skills) WHERE value = 'AI Fundamentals')
    SET @skills = JSON_MODIFY(@skills, 'append $', 'AI Fundamentals');
  IF NOT EXISTS (SELECT 1 FROM OPENJSON(@skills) WHERE value = 'Prompt Engineering')
    SET @skills = JSON_MODIFY(@skills, 'append $', 'Prompt Engineering');

  /* Persist updates */
  UPDATE dbo.portfolio_profile
  SET 
    full_name = @full_name,
    title = @title,
    summary = @summary,
    skills = @skills,
    experience = @experience,
    education = @education,
    projects = @projects,
    updated_at = SYSUTCDATETIME()
  WHERE id = 1;

  COMMIT TRAN;
  PRINT 'Profile updated successfully.';
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRAN;
  THROW;
END CATCH;
