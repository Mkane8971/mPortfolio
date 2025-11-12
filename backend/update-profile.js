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
        title: "Product Development Analyst - Revenue Cycle Systems (Inpatient/Outpatient)",
        company: "Medsphere Corporation",
        period: "2024 – 2025",
        location: "Remote",
        responsibilities: [
          "Tested and validated system enhancements across multiple releases, identifying critical defects that improved system accuracy and user experience",
          "Collaborated with developers and DevOps engineers to reproduce issues, test fixes, and ensure data consistency post-deployment",
          "Improved claim and reimbursement accuracy by optimizing configuration for interoperability standards (835/837, 270/271, HL7)",
          "Authored test plans, user documentation, and troubleshooting guides to support cross-functional QA and product training",
          "Automated environment log reviews and data validation using PowerShell and Bash scripting, reducing manual verification time by 40%",
          "Supported SQL and SSRS report development for revenue cycle analytics and performance dashboards"
        ]
      },
      {
        title: "Health Information Management Intern",
        company: "Purdue University Global",
        period: "Mar 2024 – Jul 2024",
        location: "Phoenix, AZ",
        responsibilities: [
          "Conducted data validation and integrity checks across patient, billing, and encounter data",
          "Designed queries and reports for process improvement and quality audits",
          "Mapped relational database models to support new EHR workflow documentation",
          "Collaborated with insurance payors to analyze denial trends and enhance data accuracy in submissions"
        ]
      },
      {
        title: "Federal Administrator",
        company: "Leadership across 5 Agencies (SSA, DOD, VA, U.S. Census, U.S. Coast Guard)",
        period: "Nov 2010 – Oct 2022",
        location: "Various Federal Locations",
        responsibilities: [
          "Operated secure systems for sensitive financial and medical data within federal agencies",
          "Performed detailed quality analysis to drive improvements and reduce data discrepancies in federal pay and benefits systems",
          "Recognized for precision and accountability in issue resolution, team leadership, and cross-departmental collaboration",
          "Received commendations for service excellence and communication in high-stakes operational environments"
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
        degree: "Registered Health Information Administrator (RHIA)",
        institution: "AHIMA",
        details: "Active Certification"
      },
      {
        degree: "Certified Coding Specialist (CCS)",
        institution: "AHIMA",
        details: "Active Certification"
      },
      {
        degree: "Certified Advanced Software Engineer",
        institution: "Hack Reactor",
        details: "Python, Javascript, git, CI/CD, no-sql db"
      },
      {
        degree: "Data Analytics Professional Certificate",
        institution: "Google Corp.",
        details: "Prepare, process, analyze, share data"
      },
      {
        degree: "IT Support Professional Certificate",
        institution: "Google Corp.",
        details: "Windows and Linux system admin, Networking, Cybersecurity"
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
        tech: "React, FastAPI, PostgreSQL, Docker, CI/CD, Git",
        description: "Full‑stack application that improves visitor accountability and safety in healthcare facilities. Implemented Agile practices and engineered a secure, scalable RESTful API.",
        skills: ["React", "FastAPI", "PostgreSQL", "Docker", "Agile", "RESTful API"]
      },
      {
        name: "Yoganautics",
        tech: "React, FastAPI, PostgreSQL, Docker, CI/CD, Git, PayPal APIs",
        description: "Full‑stack business management app for class enrollment, payment processing, and virtual class hosting. Built FastAPI backend + React frontend and integrated PayPal with OWASP‑aligned controls.",
        skills: ["Full Stack", "Payments", "FastAPI", "React", "PostgreSQL", "Docker", "CI/CD", "PayPal", "Security"]
      }
    ];

    const skills = [
      "Software Quality Assurance & Testing",
      "EHR/EPM Implementation",
      "Revenue Cycle Systems (835/837, 270/271, HL7)",
      "ICD-10-CM Coding",
      "ICD-10-PCS Coding",
      "CPT/HCPCS Coding",
      "MS-DRG Assignment",
      "APR-DRG Classification",
      "Medical Record Documentation Analysis",
      "Clinical Documentation Improvement (CDI)",
      "Coding Compliance & Auditing",
      "Health Information Exchange (HIE)",
      "Master Patient Index (MPI) Management",
      "Release of Information (ROI)",
      "Legal Health Record Management",
      "Data Governance & Quality Management",
      "Workflow Analysis",
      "Data Validation & Integrity Testing",
      "Agile / DevOps Collaboration",
      "Technical Documentation",
      "Interoperability & Compliance (HIPAA, HITECH)",
      "Python",
      "SQL",
      "R",
      "JavaScript",
      "HTML",
      "Git/TFS",
      "Docker",
      "PowerShell",
      "Bash",
      "Postman",
      "FastAPI",
      "React",
      ".NET",
      "Django",
      "Entity Framework",
      "SQL Server Management Studio",
      "Visual Studio Enterprise",
      "Insurance Policy Interpretation",
      "Claims Adjudication & Denial Resolution",
      "Data Analytics (SQL, SSRS, Excel, Power BI)",
      "Payment Processing & Financial Systems",
      "Clearinghouse Integration",
      "EFT/ERA Reconciliation",
      "Encoder Systems (3M, Optum)",
      "Revenue Integrity",
      "Charge Description Master (CDM) Maintenance",
      "Abstracting & Case Mix Analysis"
    ];

    await pool.request()
      .input('full_name', sql.NVarChar, 'Matthew Kane')
      .input('title', sql.NVarChar, 'Quality Manager | Healthcare IT & Software QA Specialist')
      .input('summary', sql.NVarChar, "I'm a RHIA/CCS‑certified Quality Manager and healthcare software analyst who loves improving how systems work in the real world. I bridge HIM, revenue cycle, and engineering—designing tests, validating data, and collaborating with dev/QA to ship reliable features. I speak both clinical and technical, focus on usability and compliance (HIPAA/HITECH), and I’m comfortable digging into SQL, APIs, and logs to find root causes fast. If you need someone who’s calm, analytical, and outcomes‑driven, I’m a great fit. Contact: 602‑317‑7687 | Mkane8971@gmail.com | Relocation: Madison, WI | Travel: Yes")
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
