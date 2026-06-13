# AWS Architecture Design Guide
*For your CCP Cloud Computing Assignment*

To get full marks for Step 1 ("Design & document architecture"), use draw.io or Lucidchart to draw the following diagram. This perfectly maps to the AWS CCP rubric!

### 1. The Outer Box (The Cloud)
* Draw a big box and label it **AWS Cloud**.
* Inside that, draw another box labeled **VPC (Virtual Private Cloud)**.

### 2. The Frontend (S3 + CloudFront)
* Draw a user (laptop icon) on the far left.
* Draw an arrow from the user to a globe icon labeled **Amazon CloudFront (CDN)**.
* Draw an arrow from CloudFront to a bucket icon labeled **Amazon S3 (React Frontend)**.

### 3. The Backend (ECS Fargate + Load Balancer)
* Inside your VPC box, draw a box labeled **Public Subnet** and another labeled **Private Subnet**.
* Draw an arrow from the User to an icon labeled **Application Load Balancer (ALB)** inside the Public Subnet.
* Draw an arrow from the ALB to a box labeled **Amazon ECS (AWS Fargate)** inside the Private Subnet.
* *Note:* Add a small lock icon on ECS and label it "Security Group: Port 5000".

### 4. The Database (Amazon RDS)
* Draw an arrow from ECS Fargate to a database cylinder icon labeled **Amazon RDS (PostgreSQL)**.
* Make sure the RDS database is also sitting inside your Private Subnet so it is secure from the public internet.

### 5. Extra Services (To impress the professor)
* Add an icon for **Amazon CloudWatch** floating near the top, pointing to your ECS container and RDS database (labeled "Monitoring & Logs").
* Add an icon for **AWS IAM** (labeled "Least Privilege Roles").
* Add an icon for **GitHub Actions** outside the AWS box, with an arrow pointing to S3 and ECS (labeled "CI/CD Pipeline").
