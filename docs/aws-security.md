# AWS Production Security Baseline Framework
Provides crisp identity perimeters, isolation rings, and tracking configurations.

## 1. Perimeter Architecture Diagram
[ Internet / Corporate Network ]
               │ (HTTPS / TLS 1.3)
               ▼
   [ AWS WAF / Shield Advanced ]
               │
               ▼
    [ Amazon Route 53 DNS ]
               │
               ▼
[ Application Load Balancer (ALB) ]
               │ (Private Target Groups)
               ▼
    [ VPC Private App Subnet ]
   ┌──────────────────────────┐
   │  ECS Tasks / EC2 Nodes   │ ◄── [ AWS IAM Role / KMS ]
   └──────────────────────────┘

## 2. Infrastructure as Code Blueprint (Terraform)
```hcl
# Tight Security Group Restricting Inbound to Load Balancer Targets Only
resource "aws_security_group" "app_tier" {
  name        = "app-production-tier-sg"
  description = "Isolate application layer traffic"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow HTTPS from ALB Only"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    description = "Allow secure outbound API handshakes"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## 3. Operations Guardrails
* Enforce IAM Session Manager access; entirely ban legacy port 22 SSH keys.
* Run AWS CloudTrail log streaming targeting immutable, locked Amazon S3 Buckets.
* Implement centralized AWS Organizations Service Control Policies (SCPs).
