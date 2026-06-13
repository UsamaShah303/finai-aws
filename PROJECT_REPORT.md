# Full Stack Cloud-Native Application Deployment Using AWS
**Course:** Cloud Computing and Virtualization (CCP)
**Department:** Software Engineering
**Program:** BS

---

## 1. Introduction
The objective of this project is to design, deploy, and monitor a highly available, cloud-native web application entirely on Amazon Web Services (AWS). This project successfully maps a modern, full-stack Fintech application (FinAI Nexus) to enterprise-grade AWS infrastructure, utilizing serverless compute, managed databases, and global content delivery networks.

## 2. Literature Review / Related Work
Traditional monolithic architectures often struggle with scalability and high operational overhead. Modern cloud computing resolves this through **Serverless Microservices** and **Infrastructure as Code (IaC)**. 
- **Compute:** AWS Lambda provides event-driven, scalable compute without the need for managing EC2 instances. 
- **Storage:** Amazon S3 and CloudFront provide high-speed, edge-cached static hosting.
- **Database:** Amazon RDS provides automated backups and high availability for relational SQL data, while DynamoDB offers single-digit millisecond latency for NoSQL session state.

This project implements these concepts to achieve a highly scalable architecture.

## 3. System Design & Architecture Diagram
The application utilizes the following AWS architecture:
1. **Frontend Layer:** Hosted on **Amazon S3** with **CloudFront (CDN)** for global distribution. Origin Access Control (OAC) ensures the S3 bucket is strictly private.
2. **Compute Layer:** The Python Flask backend is deployed as a Serverless function on **AWS Lambda**, exposed securely via **Amazon API Gateway**.
3. **Database Layer:** A managed **Amazon RDS (PostgreSQL)** database deployed inside a Private Subnet within a custom Virtual Private Cloud (VPC). **Amazon DynamoDB** is utilized for ephemeral session states.
4. **Security & Auth:** **Amazon Cognito** handles user authentication. Strict IAM Roles follow the principle of Least Privilege.

*(Insert your draw.io diagram here)*

## 4. Methodology
The deployment was executed using an automated, DevOps-driven methodology:
1. **Infrastructure as Code:** 100% of the AWS infrastructure was written in HashiCorp **Terraform**. This ensures the architecture is reproducible, version-controlled, and immutable.
2. **CI/CD Pipeline:** A custom **GitHub Actions** pipeline was constructed to automate deployments. 
    - Job 1 runs `terraform apply`.
    - Job 2 builds the React application and syncs it to S3.
    - Job 3 packages the Flask API and updates the AWS Lambda function.
3. **Networking:** A custom VPC was provisioned with public and private subnets to isolate the database layer from the public internet.

## 5. Source Code Repositories
- **Infrastructure Code:** Defined in the `infra/` directory (Terraform).
- **Backend Code:** Defined in the `backend/` directory (Python/Flask).
- **Frontend Code:** Defined in the `frontend/` directory (React/Vite).
- **CI/CD:** Defined in `.github/workflows/deploy.yml`.

## 6. Results & Discussion
The application successfully deployed to AWS. 
- **Scalability:** AWS Lambda automatically scales concurrent executions based on API Gateway traffic.
- **High Availability:** CloudFront ensures the frontend is available at edge locations globally, surviving regional outages.
- **Automation:** The CI/CD pipeline eliminated manual deployment errors, significantly improving deployment velocity.

## 7. Cost Analysis & Security Considerations
### Security Considerations:
- **Network Isolation:** RDS is placed in a private subnet and can only be accessed by the Lambda Security Group.
- **IAM Least Privilege:** The Lambda execution role only contains permissions explicitly required (e.g., `s3:GetObject` for the reports bucket, and `dynamodb:PutItem`).
- **Encryption:** TLS/SSL is enforced via API Gateway and CloudFront.

### Cost Analysis (Estimated Monthly):
- **AWS Lambda / API Gateway:** Free Tier eligible (1 million requests free).
- **Amazon S3 / CloudFront:** Free Tier eligible (50GB free outbound).
- **Amazon RDS (db.t3.micro):** Free Tier eligible (750 hours free).
- **Total Expected Cost:** ~$0.00/month under Free Tier constraints. Cost optimization was achieved by choosing Serverless (pay-per-request) over always-on EC2 instances.

## 8. References
1. Amazon Web Services. (2024). AWS Well-Architected Framework.
2. HashiCorp. (2024). Terraform AWS Provider Documentation.
3. Zappa. (2024). Serverless Python Web Services.
