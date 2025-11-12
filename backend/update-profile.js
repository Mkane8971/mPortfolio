import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  server: 'localhost',
  port: 1434,
  user: 'sa',
  password: 'Pass123!',
  database: 'portfolio',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function updateProfile() {
  try {
    const pool = await sql.connect(config);
    
    const experience = [
      {
        title: "Product Development Analyst - Revenue Cycle Management Systems",
        company: "Medsphere Corp.",
        period: "2024 – Present",
        location: "Remote",
        responsibilities: [
          "Analyzed health data to uncover inefficiencies in billing workflows, increasing reimbursement accuracy and reducing claim denials",
          "Supported critical patch releases resolving software defects, improving product stability and client confidence",
          "Maintained SQL and SSRS reports monitoring claims, payer turnaround times, and system performance",
          "Partnered with development and DevOps teams to test updates, validate data migrations, and fine-tune triggers/stored procedures",
          "Implemented configuration for interoperability standards (835/837, 270/271, HL7)",
          "Applied advanced PowerShell and Bash scripting to automate log reviews and data integrity checks"
        ]
      },
      {
        title: "Health Information Management Intern",
        company: "Purdue University Global",
        period: "Mar 2024 – Jul 2024",
        location: "Phoenix, AZ",
        responsibilities: [
          "Demonstrated leadership in HIM functions and data management",
          "Produced actionable reports by designing functions to process and analyze complex medical data",
          "Collaborated with insurance payors, reducing denials through detailed analysis",
          "Developed database design documentation",
          "Assigned and reviewed ICD-10 CM and HCPCS codes"
        ]
      },
      {
        title: "Federal Employment - Leadership across 5 Agencies",
        company: "SSA, DOD, VA, U.S. Census, U.S. Coast Guard",
        period: "Nov 2010 – Oct 2022",
        location: "Various",
        responsibilities: [
          "Led multi-agency teams in high-stakes environments",
          "Directed protected information systems and facilitated interagency compliance",
          "Achieved measurable results enhancing communication and issue resolution",
          "Received multiple awards for Active Duty military operations overseas"
        ]
      }
    ];

    const education = [
      {
        degree: "Master of Science in Information Technology",
        institution: "Illinois Institute of Technology",
        status: "In Progress"
      },
      {
        degree: "Bachelor of Science in Health Information Management",
        institution: "Purdue University Global",
        status: "Completed"
      },
      {
        degree: "Certified Advanced Software Engineer",
        institution: "Hack Reactor",
        details: "Python, Javascript, git, CI/CD, cloud computing"
      },
      {
        degree: "Data Analytics Professional Certification",
        institution: "Google Corp.",
        details: "Prepare, process, analyze, share data"
      },
      {
        degree: "IT Support Professional Certification",
        institution: "Google Corp.",
        details: "Networking, OS Admin, Cybersecurity"
      }
    ];

    const projects = [
      {
        name: "Membership Committee Chair",
        organization: "AHIMA Arizona Chapter (AzHIMA)",
        description: "Lead analytics and engagement strategies to increase membership and retention. Collaborate with educational and healthcare organizations in Arizona.",
        skills: ["Analytics", "Leadership", "Healthcare IT", "Reporting"]
      },
      {
        name: "VisCare",
        tech: "React, Fast API, PostgreSQL, Docker, CI/CD, Git",
        description: "Full-stack application allowing healthcare facilities to better manage visitor accountability. Implemented Agile methodologies and engineered RESTful API infrastructure.",
        skills: ["React", "Fast API", "PostgreSQL", "Docker", "Agile", "RESTful API"]
      }
    ];

    const skills = [
      "SQL Server & SSRS Reporting",
      "Python",
      "JavaScript",
      "React",
      "C#",
      ".NET",
      "Fast API",
      "Docker",
      "Git/TFS",
      "PowerShell",
      "Bash",
      "Revenue Cycle Management",
      "HL7/EDI (835/837, 270/271)",
      "EHR/EPM Systems",
      "Data Analytics",
      "Healthcare Compliance",
      "Agile/DevOps",
      "Technical Documentation"
    ];

    await pool.request()
      .input('full_name', sql.NVarChar, 'Matthew Kane')
      .input('title', sql.NVarChar, 'RCM Specialist & Software Engineer')
      .input('summary', sql.NVarChar, 'Software engineer with a deep foundation in data quality, system testing, and health IT workflows. Experienced in analyzing, validating, and improving applications that support billing, interoperability, and patient safety. A former federal leader turned data-driven innovator with analytical rigor, technical precision, and operational empathy. Contact: 602-317-7687 | Mkane8971@gmail.com')
      .input('skills', sql.NVarChar, JSON.stringify(skills))
      .input('experience', sql.NVarChar, JSON.stringify(experience))
      .input('education', sql.NVarChar, JSON.stringify(education))
      .input('projects', sql.NVarChar, JSON.stringify(projects))
      .query(`
        UPDATE portfolio_profile 
        SET full_name = @full_name,
            title = @title,
            summary = @summary,
            skills = @skills,
            experience = @experience,
            education = @education,
            projects = @projects,
            updated_at = GETDATE()
        WHERE id = 1
      `);

    console.log('✓ Profile updated successfully with Matthew Kane\'s resume');
    await pool.close();
  } catch (err) {
    console.error('Error updating profile:', err);
  }
}

updateProfile();
