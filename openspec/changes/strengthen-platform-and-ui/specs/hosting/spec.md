# Spec Delta

## ADDED Requirements

### Requirement: Production deployment requires successful validation
Production deployments SHALL occur only after all required continuous-integration checks for the change have passed.

#### Scenario: Required checks pass
- **WHEN** all required continuous-integration checks pass for a change merged to the production branch
- **THEN** the change is eligible for production deployment

#### Scenario: A required check fails
- **WHEN** any required continuous-integration check fails for a change
- **THEN** that change is not deployed to production

### Requirement: Verify production deployment
After a production deployment, the deployment process SHALL verify that the public site responds successfully and report a failed verification to maintainers.

#### Scenario: The deployed site is available
- **WHEN** a production deployment completes and the public site responds successfully
- **THEN** the deployment verification reports success

#### Scenario: The deployed site is unavailable
- **WHEN** a production deployment completes and the public site does not respond successfully
- **THEN** the deployment verification reports failure to maintainers
