# Note: Execute all the scripts in MONGOSH

# Show all the dbs
show dbs

# Select and Use recruai collection
use recruai

# Create a new tenant with default data.
# db.tenants.insertOne(
# {
#   "tenantCode": "TEN00005",
#   "tenantName": "CCL-QA",
#   "tenantLogo": "https://www.clearcode-labs.com/assets/images/ccl/company_logo_web_nav.webp",
#   "phoneNumber": "8925818871",
#   "mobileNumber": "8925818871",
#   "emailId": "sales@clearcode-labs.com",
#   "gstNo": "27AABCU9603R1ZM",
#   "panNo": "ABCDE1234F",
#   "website": "https://www.clearcode-labs.com/",
#   "faxNo": "+91 22 12345678",
#   "address": "Shri Maharishi Tech Park, No. 4-5/2, Saravanampatti,Coimbatore-641035, Tamil Nadu, India",
#   "country": "India",
#   "activeLicense": 
#   {
#     "licenseKey": "e3b0c44298fc1c1494649b934ca495991b7852b855",
#     "expiryDate": "2025-12-31"
#   },
#   "settings": [
#     {
#       "settingKey": "settingValue"
#     }
#   ],
#   "status": "Active",
#   "createdBy": "admin",
#   "updatedBy": "admin",
#   "__v": 0,
#   "organizationName": "ClearCode Labs Pvt. Ltd.",
#   "tenantJobCode": "ccl-qa",
#   "postalCode": "636020",
#   "lastUpdatedBy": "Obuliraj"
# })

# Create admin user for newly onboarded tenant
# password: Encryped value- admin@123
# Unique Fields: userName, email,
# role: Get the values from lookup collection (lookupkey: USER_ROLES)
# db.tenantUsers.insertOne(
#   {
#   "tenantId": "TEN00005",
#   "userName": "admin",
#   "email": "admin0005.m@ifour.io",
#   "password": "$2b$10$EMK3NKL4HeasgYJt5tnvcOVFvbqihjnlib5XxUOKYwwIvV0AJ4rvS", 
#   "role": ["Recruiter","Hiring Manager","Admin"],
#   "profileImage": null,
#   "status": "Active",
#   "createdBy": "admin",
#   "lastUpdatedBy": "admin",
#   "userId": "a08aea86-65e3-4248-af0e-3f11915efcb9",
#   "__v": 0
# })

# Create Master Data set in Lookup Schema

# Default Data: User Roles
db.lookups.insertMany([
    {
       "tenantId": "TEN00005",
       "lookupKey": "USER_ROLES",
       "keyName": "Hiring Manager",
       "keyValue": "hiring_manager",
       "dataType": "string",
       "status": "Active",
       "createdBy": "SYSTEM",
       "lastUpdatedBy": "SYSTEM"
   },
   {
       "tenantId": "TEN00005",
       "lookupKey": "USER_ROLES",
       "keyName": "Admin",
       "keyValue": "Admin",
       "dataType": "string",
       "status": "Active",
       "createdBy": "SYSTEM",
       "lastUpdatedBy": "SYSTEM"
   },
   {
       "tenantId": "TEN00005",
       "lookupKey": "USER_ROLES",
       "keyName": "Recruiter",
       "keyValue": "recruiter",
       "dataType": "string",
       "status": "Active",
       "createdBy": "SYSTEM",
       "lastUpdatedBy": "SYSTEM"
   }
  ])

  # Default Data: Job Sector List
  db.lookups.insertMany([
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Software Development",
    "keyValue": "software_development",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Data Science",
    "keyValue": "data_science",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Cybersecurity",
    "keyValue": "cybersecurity",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Cloud Computing",
    "keyValue": "cloud_computing",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "IT Support",
    "keyValue": "it_support",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Network Administration",
    "keyValue": "network_administration",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "DevOps",
    "keyValue": "devops",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Database Administration",
    "keyValue": "database_administration",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Systems Analysis",
    "keyValue": "systems_analysis",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Project Management",
    "keyValue": "project_management",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "UI/UX Design",
    "keyValue": "ui_ux_design",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Business Analysis",
    "keyValue": "business_analysis",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Quality Assurance",
    "keyValue": "quality_assurance",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Artificial Intelligence",
    "keyValue": "artificial_intelligence",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Machine Learning",
    "keyValue": "machine_learning",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Mobile Development",
    "keyValue": "mobile_development",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Web Development",
    "keyValue": "web_development",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "IT Consulting",
    "keyValue": "it_consulting",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "IT Training",
    "keyValue": "it_training",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Technical Writing",
    "keyValue": "technical_writing",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Technology",
    "keyValue": "technology",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Marketing",
    "keyValue": "marketing",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Finance",
    "keyValue": "finance",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Product Management",
    "keyValue": "product_management",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Human Resources",
    "keyValue": "human_resources",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Design",
    "keyValue": "design",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Sales",
    "keyValue": "sales",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Blockchain Development",
    "keyValue": "blockchain_development",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Robotics",
    "keyValue": "robotics",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Augmented Reality",
    "keyValue": "augmented_reality",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "JOB_SECTOR",
    "keyName": "Virtual Reality",
    "keyValue": "virtual_reality",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  }
  ])

# Default Data: Calendar Time Zone
db.lookups.insertMany(
 [
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "UTC (Coordinated Universal Time)",
    "keyValue": "Etc/UTC",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT (Greenwich Mean Time)",
    "keyValue": "Etc/GMT",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+1:00 (Central European Time - Berlin)",
    "keyValue": "Europe/Berlin",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+2:00 (Eastern European Time - Athens)",
    "keyValue": "Europe/Athens",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+3:00 (Moscow Standard Time - Moscow)",
    "keyValue": "Europe/Moscow",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+3:30 (Iran Standard Time - Tehran)",
    "keyValue": "Asia/Tehran",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+4:00 (Gulf Standard Time - Dubai)",
    "keyValue": "Asia/Dubai",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+4:30 (Afghanistan Time - Kabul)",
    "keyValue": "Asia/Kabul",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+5:00 (Pakistan Standard Time - Karachi)",
    "keyValue": "Asia/Karachi",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+5:30 (India Standard Time - Kolkata)",
    "keyValue": "Asia/Kolkata",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+5:45 (Nepal Time - Kathmandu)",
    "keyValue": "Asia/Kathmandu",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+6:00 (Bangladesh Standard Time - Dhaka)",
    "keyValue": "Asia/Dhaka",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+6:30 (Cocos Islands Time - Yangon)",
    "keyValue": "Asia/Yangon",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+7:00 (Indochina Time - Bangkok)",
    "keyValue": "Asia/Bangkok",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+8:00 (China Standard Time - Beijing)",
    "keyValue": "Asia/Shanghai",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+9:00 (Japan Standard Time - Tokyo)",
    "keyValue": "Asia/Tokyo",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+9:30 (Central Australia Time - Adelaide)",
    "keyValue": "Australia/Adelaide",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+10:00 (Eastern Australia Time - Sydney)",
    "keyValue": "Australia/Sydney",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+11:00 (Solomon Islands Time - Honiara)",
    "keyValue": "Pacific/Guadalcanal",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT+12:00 (New Zealand Standard Time - Wellington)",
    "keyValue": "Pacific/Auckland",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-1:00 (Cape Verde Time - Praia)",
    "keyValue": "Atlantic/Cape_Verde",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-2:00 (South Georgia Time - King Edward Point)",
    "keyValue": "Atlantic/South_Georgia",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-3:00 (Argentina Time - Buenos Aires)",
    "keyValue": "America/Argentina/Buenos_Aires",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-3:30 (Newfoundland Time - St. John's)",
    "keyValue": "America/St_Johns",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-4:00 (Atlantic Time - Halifax)",
    "keyValue": "America/Halifax",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-5:00 (Eastern Time - New York)",
    "keyValue": "America/New_York",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-6:00 (Central Time - Chicago)",
    "keyValue": "America/Chicago",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-7:00 (Mountain Time - Denver)",
    "keyValue": "America/Denver",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-8:00 (Pacific Time - Los Angeles)",
    "keyValue": "America/Los_Angeles",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-9:00 (Alaska Time - Anchorage)",
    "keyValue": "America/Anchorage",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-10:00 (Hawaii-Aleutian Time - Honolulu)",
    "keyValue": "Pacific/Honolulu",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-11:00 (Samoa Standard Time - Pago Pago)",
    "keyValue": "Pacific/Pago_Pago",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_TIME_ZONE",
    "keyName": "GMT-12:00 (Baker Island Time)",
    "keyValue": "Etc/GMT+12",
    "dataType": "string",
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM"
  }
])

# Default Data: Job Status List
db.lookups.insertMany([
{
  "tenantId": "TEN00005",
  "lookupKey": "JOB_STATUS",
  "keyName": "Draft",
  "keyValue": "draft",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy": "SYSTEM",
  "lastUpdatedBy": "SYSTEM",
  "createdDate": "2024-08-04T13:27:17.076Z",
  "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
},
{
  "tenantId": "TEN00005",
  "lookupKey": "JOB_STATUS",
  "keyName": "Open",
  "keyValue": "open",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy": "SYSTEM",
  "lastUpdatedBy": "SYSTEM",
  "createdDate": "2024-08-04T13:27:17.076Z",
  "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
},
{
  "tenantId": "TEN00005",
  "lookupKey": "JOB_STATUS",
  "keyName": "On Hold",
  "keyValue": "on_hold",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy": "SYSTEM",
  "lastUpdatedBy": "SYSTEM",
  "createdDate": "2024-08-04T13:27:17.076Z",
  "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
},
{
  "tenantId": "TEN00005",
  "lookupKey": "JOB_STATUS",
  "keyName": "Closed",
  "keyValue": "closed",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy": "SYSTEM",
  "lastUpdatedBy": "SYSTEM",
  "createdDate": "2024-08-04T13:27:17.076Z",
  "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
},
{
  "tenantId": "TEN00005",
  "lookupKey": "JOB_STATUS",
  "keyName": "Archived",
  "keyValue": "archived",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy": "SYSTEM",
  "lastUpdatedBy": "SYSTEM",
  "createdDate": "2024-08-04T13:27:17.076Z",
  "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
}])

# Default Data: Tenant Preference: Date Format
db.lookups.insertMany(
  [
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "MM/DD/YYYY (e.g., 12/31/2024)",
          "keyValue": "MM/dd/yyyy",
          "dataType": "string",
          "isDefault": true,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "DD/MM/YYYY (e.g., 31/12/2024)",
          "keyValue": "dd/MM/yyyy",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "YYYY-MM-DD (e.g., 2024-12-31)",
          "keyValue": "yyyy-MM-dd",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "DD MMM YYYY h:mm a (e.g., 31 Dec 2024, 5:00 PM)",
          "keyValue": "dd MMM yyyy, h:mm a",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "MMMM DD, YYYY (e.g., December 31, 2024)",
          "keyValue": "MMMM dd, yyyy",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "YYYY/MM/DD (e.g., 2024/12/31)",
          "keyValue": "yyyy/MM/dd",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "MM-DD-YYYY h:mm:ss a (e.g., 12-31-2024, 5:00:00 PM)",
          "keyValue": "MM-dd-yyyy, h:mm:ss a",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "Day, Month DD, YYYY (e.g., Tuesday, December 31, 2024)",
          "keyValue": "EEEE, MMMM d, yyyy",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "DD-MM-YYYY HH:mm (e.g., 31-12-2024 17:00)",
          "keyValue": "dd-MM-yyyy HH:mm",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
      },
      {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "DD-MM-YYYY HH:mm:ss (e.g., 31-12-2024 17:00:00)",
          "keyValue": "dd-MM-yyyy HH:mm:ss",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        },
        {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "MM/DD/YYYY HH:mm (e.g., 12/31/2024 05:00 PM)",
          "keyValue": "MM/dd/yyyy h:mm a",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        },
        {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "MMMM DD, YYYY h:mm a (e.g., December 31, 2024 5:00 PM)",
          "keyValue": "MMMM dd, yyyy h:mm a",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        },
        {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "EEE, MM/dd/yyyy (e.g., Tue, 12/31/2024)",
          "keyValue": "EEE, MM/dd/yyyy",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        },
        {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "YYYY-MM-DDTHH:mm:ssZ (ISO 8601 format, e.g., 2024-12-31T17:00:00Z)",
          "keyValue": "yyyy-MM-dd'T'HH:mm:ss'Z'",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        },
        {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "MM/DD/YYYY, h:mm:ss a (e.g., 12/31/2024, 5:00:00 PM)",
          "keyValue": "MM/dd/yyyy, h:mm:ss a",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        },
        {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "Day DD-MM-YYYY (e.g., Tuesday 31-12-2024)",
          "keyValue": "EEEE dd-MM-yyyy",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        },
        {
          "tenantId": "TEN00005",
          "lookupKey": "DATE_FORMATS",
          "keyName": "dd MMM yyyy HH:mm:ss.SSS (e.g., 31 Dec 2024 17:00:00.000)",
          "keyValue": "dd MMM yyyy HH:mm:ss.SSS",
          "dataType": "string",
          "isDefault": false,
          "status": "Active",
          "createdBy": "SYSTEM",
          "lastUpdatedBy": "SYSTEM"
        }]
  )

# Default Data: Tenant Preference- AI Models List
db.lookups.insertMany([
  {
    "tenantId": "TEN00005",
    "lookupKey": "AI_MODELS",
    "keyName": "Gemma 2B",
    "keyValue": "gemma2:2b",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "AI_MODELS",
    "keyName": "Llama 3.1",
    "keyValue": "llama3.1",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  }
])

# Default Data: Calendar- Google Config List
db.lookups.insertMany([
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_GOOGLE_CONFIG",
    "keyName": "Client ID",
    "keyValue": "clientId",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_GOOGLE_CONFIG",
    "keyName": "Client Secret",
    "keyValue": "clientSecret",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_GOOGLE_CONFIG",
    "keyName": "Private Key",
    "keyValue": "privateKey",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "CALENDAR_GOOGLE_CONFIG",
    "keyName": "Client Email",
    "keyValue": "clientEmail",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  }
])

# Default Data: Calendar- TEAMS Config List
db.lookups.insertMany([
  {
  "tenantId": "TEN00005",
  "lookupKey": "CALENDAR_TEAMS_CONFIG",
  "keyName": "Client ID",
  "keyValue": "clientId",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy":"SYSTEM",
  "lastUpdatedBy": "SYSTEM"
},
{
  "tenantId": "TEN00005",
  "lookupKey": "CALENDAR_TEAMS_CONFIG",
  "keyName": "Client Secret",
  "keyValue": "clientSecret",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy":"SYSTEM",
  "lastUpdatedBy": "SYSTEM"
},
{
  "tenantId": "TEN00005",
  "lookupKey": "CALENDAR_TEAMS_CONFIG",
  "keyName": "Tenant ID",
  "keyValue": "tenantId",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy":"SYSTEM",
  "lastUpdatedBy": "SYSTEM"
},
{
  "tenantId": "TEN00005",
  "lookupKey": "CALENDAR_TEAMS_CONFIG",
  "keyName": "Email ID",
  "keyValue": "emailId",
  "dataType": "string",
  "isDefault": false,
  "status": "Active",
  "createdBy":"SYSTEM",
  "lastUpdatedBy": "SYSTEM"
}])

# Default Data: Mail- Outlook Config List
db.lookups.insertMany([
  {
    "tenantId": "TEN00005",
    "lookupKey": "MAIL_OUTLOOK_CONFIG",
    "keyName": "Client ID",
    "keyValue": "clientId",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "MAIL_OUTLOOK_CONFIG",
    "keyName": "Client Secret",
    "keyValue": "clientSecret",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "MAIL_OUTLOOK_CONFIG",
    "keyName": "Access Key",
    "keyValue": "accessKey",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  }
])

# Default Data: ATS Integration Config List
db.lookups.insertMany([
  {
    "tenantId": "TEN00005",
    "lookupKey": "ATS_ZOHO_CONFIG",
    "keyName": "Client ID",
    "keyValue": "clientId",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "ATS_ZOHO_CONFIG",
    "keyName": "Client Secret",
    "keyValue": "clientSecret",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  },
  {
    "tenantId": "TEN00005",
    "lookupKey": "ATS_ZOHO_CONFIG",
    "keyName": "Code",
    "keyValue": "code",
    "dataType": "string",
    "isDefault": false,
    "status": "Active",
    "createdBy": "SYSTEM",
    "lastUpdatedBy": "SYSTEM",
    "createdDate": "2024-08-04T13:27:17.076Z",
    "lastUpdatedDate": "2024-08-04T13:27:17.076Z"
  }
])

# Default Data: Email Templates
db.emailTemplates.insertMany([
  {
  "tenantId": "TEN00005",
  "templateKey": "SHORTLISTED_WITH_MEETING",
  "templateContent": "<!DOCTYPE html>\n<html lang=\"en\">\n\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Shortlisted Candidate Notification</title>\n</head>\n\n<body\n    style=\"margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #000; background-color: #FFFFFF;\">\n    <div style=\"max-width: 600px; margin: 0 auto; background-color: #FFFFFF;padding: 20px;\">\n        <div\n            style=\"background-color: #3aafa9; color: #ffffff; text-align: center; padding: 20px; position: relative;border-radius: 6px;\">\n            <!-- <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/8fb8ef2a71586fd6f7c52aa60a3c8ecd2dbd7c382c68c03d5e1651e52bee8469?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\"\n                alt=\"\" style=\"position: absolute; width: 60px; height: 60px; left: 0 !important; top: 0 !important;\"\n                aria-hidden=\"true\"> -->\n            <span>\n                <h3 style=\"margin: 0; font-weight: 600; text-align: center; color: white;\"><Title></h3>\n            </span>\n            <!-- <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/73201c41b7af9c2492ec1bbd8610e9ba7920e071cf5385de405ac8261aa58332?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\"\n                alt=\"\" style=\"position: absolute; width: 60px; height: 60px; right: 0 !important; top: 0 !important;\"\n                aria-hidden=\"true\"> -->\n        </div>\n        <section style=\"margin-top: 10px;\">\n            <div style=\"color: #000;\">\n                <p>\n                 <Candidate>,\n                </p>\n                <p><Description></p>\n            </div>\n            <br>\n            <div style=\"background-color: #f5f5f5; border-radius: 6px; padding: 20px;\">\n                <div style=\"margin-bottom: 6px;\">\n                    <span style=\"color: #6e838a; font-size: 14px; display: block;\">Date</span>\n                    <span style=\"color: #013243; font-size: 12px; font-weight: 500;\">\n                        <Date>\n                    </span>\n                </div>\n                <div style=\"margin-bottom: 6px;\">\n                    <span style=\"color: #6e838a; font-size: 14px; display: block;\">Time</span>\n                    <span style=\"color: #013243; font-size: 12px; font-weight: 500;\"><Time></span>\n                </div>\n                <div style=\"margin-bottom: 6px;\">\n                    <span style=\"color: #6e838a; font-size: 14px; display: block;\">Zone</span>\n                    <span style=\"color: #013243; font-size: 12px; font-weight: 500;\"><TimeZone></span>\n                </div>\n                <div style=\"margin-bottom: 6px;\">\n                    <span style=\"color: #6e838a; font-size: 14px; display: block;\">Meeting link</span>\n                    <span style=\"color: #013243; font-size: 12px; font-weight: 500;\">\n                        <MeetingLink>\n                    </span>\n                </div>\n                <a href=\"<MeetingLink>\"\n                    style=\"display: inline-block; background-color: #3aafa9; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 4px; font-weight: 400; margin-top: 6px;\"\n                    target=\"_blank\" rel=\"noopener noreferrer\">Join Meet</a>\n            </div>\n            <div style=\"margin-top: 20px; color: #000;\">\n                <p>Best regards,<br>\n                    <Organizer><br>\n                        <OrganizerEmail>\n                </p>\n            </div>\n        </section>\n    </div>\n</body>\n\n</html>",
  "status": "Active",
  "createdBy": "admin",
  "lastUpdatedBy": "admin"
},
{
  "tenantId": "TEN00005",
  "templateKey": "SHORTLISTED_WITHOUT_MEETING",
  "templateContent": "<!DOCTYPE html>\n<html lang=\"en\">\n\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Shortlisted Candidate Notification</title>\n</head>\n\n<body\n    style=\"margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #000; background-color: #FFFFFF;\">\n    <div style=\"max-width: 600px; margin: 0 auto; background-color: #FFFFFF;padding: 20px;\">\n        <div\n            style=\"background-color: #3aafa9; color: #ffffff; text-align: center; padding: 20px; position: relative;border-radius: 6px;\">\n            <!-- <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/8fb8ef2a71586fd6f7c52aa60a3c8ecd2dbd7c382c68c03d5e1651e52bee8469?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\"\n                alt=\"\" style=\"position: absolute; width: 60px; height: 60px; left: 0 !important; top: 0 !important;\"\n                aria-hidden=\"true\"> -->\n            <h3 style=\"margin: 0; font-weight: 600; text-align: center; color: white;\">Congratulations - You've Been Shortlisted!</h3>\n            <!-- <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/73201c41b7af9c2492ec1bbd8610e9ba7920e071cf5385de405ac8261aa58332?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\"\n                alt=\"\" style=\"position: absolute; width: 60px; height: 60px; right: 0 !important; top: 0 !important;\"\n                aria-hidden=\"true\"> -->\n        </div>\n        <section style=\"margin-top: 10px;\">\n            <div style=\"color: #000;\">\n                <p>\n                 <Candidate>,\n                </p>\n                <p><Description></p>\n            </div>\n            <div style=\"margin-top: 10px; color: #000;\">\n                <p>Best regards,<br>\n                    <Organizer><br>\n                        <OrganizerEmail>\n                </p>\n            </div>\n        </section>\n    </div>\n</body>\n\n</html>",
  "status": "Active",
  "createdBy": "admin",
  "lastUpdatedBy": "admin"
},
{
  "tenantId": "TEN00005",
  "templateKey": "REJECTED",
  "templateContent": "<!DOCTYPE html>\n<html lang=\"en\">\n\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Application Status</title>\n</head>\n\n<body\n    style=\"margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; line-height: 1.6; background-color: white;\">\n    <div style=\"width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;\">\n        <div\n            style=\"padding: 20px; border-radius: 6px; background-color: #cca14e; color: #ffffff; text-align: center; position: relative;\">\n            <h3 style=\"margin: 0; font-weight: 600;\">Thank You for Your Interest - Your Application Status</h3>\n            <!-- <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/6e12b59f91832a25b4eff1fa5be47296a2c5253616af9c6e40a9d4638b94383d?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\" alt=\"\" aria-hidden=\"true\" style=\"position: absolute; left: -11px; bottom: -12px; width: 58px; height: 58px; border-radius: 2px;\">\n                <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/9027be7e7405ba08a31392684172c1913196e6417ba1f233d94898198028ac7f?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\" alt=\"\" aria-hidden=\"true\" style=\"position: absolute; right: -14px; bottom: -18px; width: 69px; height: 69px; border-radius: 2px;\"> -->\n        </div>\n        <div style=\"color: #000 !important;\">\n            <p>\n                <Candidate>,\n            </p>\n            <p><Description></p>\n        </div>\n        <div style=\"color: #000;\">\n            <p>Best regards,<br>\n                <Organizer><br>\n                    <OrganizerEmail>\n            </p>\n        </div>\n    </div>\n</body>\n\n</html>",
  "status": "Active",
  "createdBy": "admin",
  "lastUpdatedBy": "admin"
},
{
  "tenantId": "TEN00005",
  "templateKey": "CANCELLED",
  "templateContent": "<!DOCTYPE html>\n<html lang=\"en\">\n\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Meeting Scheduled Cancelled</title>\n</head>\n\n<body\n    style=\"margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #000; background-color: #FFFFFF;\">\n    <div style=\"max-width: 600px; margin: 0 auto; background-color: #FFFFFF;padding: 20px;\">\n        <div\n            style=\"background-color: #cca14e; color: #ffffff; text-align: center; padding: 20px; position: relative;border-radius: 6px;\">\n            <h3 style=\"margin: 0; font-weight: 600; text-align: center; color: white;\">Update Regarding Your Interview - Meeting Cancelled</h3>\n        </div>\n        <section style=\"margin-top: 10px;\">\n            <div style=\"color: #000;\">\n                <p>\n                 <Candidate>,\n                </p>\n                <p>We wanted to inform you that the upcoming interview has been canceled. We apologize for the inconvenience and appreciate your understanding. Please wait for an update from our team.</p>\n                <p>Thank you for your patience, and we will be in touch soon with further details.</p>\n            </div>\n            <br>\n            <div style=\"background-color: #f5f5f5; border-radius: 6px; padding: 20px;\">\n                <div style=\"margin-bottom: 6px;\">\n                    <span style=\"color: #6e838a; font-size: 14px; display: block;\">Date</span>\n                    <span style=\"color: #013243; font-size: 12px; font-weight: 500; text-decoration: line-through;\">\n                        <Date>\n                    </span>\n                </div>\n                <div style=\"margin-bottom: 6px;\">\n                    <span style=\"color: #6e838a; font-size: 14px; display: block;\">Time</span>\n                    <span style=\"color: #013243; font-size: 12px; font-weight: 500; text-decoration: line-through;\"><Time></span>\n                </div>\n                <div style=\"margin-bottom: 6px;\">\n                    <span style=\"color: #6e838a; font-size: 14px; display: block;\">Meeting link</span>\n                    <span style=\"color: #013243; font-size: 12px; font-weight: 500; text-decoration: line-through; pointer-events: none; user-select: none;\">\n                        <MeetingLink>\n                    </span>\n                </div>\n            </div>\n            <div style=\"margin-top: 20px; color: #000;\">\n                <p>Best regards,<br>\n                    <Organizer><br>\n                        <OrganizerEmail>\n                </p>\n            </div>\n        </section>\n    </div>\n</body>\n\n</html>",
  "status": "Active",
  "createdBy": "admin",
  "lastUpdatedBy": "admin"
},
{
  "tenantId": "TEN00005",
  "templateKey": "CANDIDATE_JOB_APPLY",
  "templateContent": "<!DOCTYPE html> <html lang=\"en\">  <head>   <meta charset=\"UTF-8\">   <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">   <title>Thank You for Your Application!</title> </head>  <body   style=\"margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #000; background-color: #FFFFFF;\">   <div style=\"max-width: 600px; margin: 0 auto; background-color: #FFFFFF;padding: 20px;\">     <div       style=\"background-color: #3aafa9; color: #ffffff; text-align: center; padding: 20px; position: relative;border-radius: 6px;\">       <!-- <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/8fb8ef2a71586fd6f7c52aa60a3c8ecd2dbd7c382c68c03d5e1651e52bee8469?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\"                 alt=\"\" style=\"position: absolute; width: 60px; height: 60px; left: 0 !important; top: 0 !important;\"                 aria-hidden=\"true\"> -->       <span>         <h3 style=\"margin: 0; font-weight: 600; text-align: center; color: white;\">Thank You for Your Application!</h3>       </span>       <!-- <img src=\"https://cdn.builder.io/api/v1/image/assets/TEMP/73201c41b7af9c2492ec1bbd8610e9ba7920e071cf5385de405ac8261aa58332?placeholderIfAbsent=true&apiKey=6b6cd045be904ec68b3361399b3475ef\"                 alt=\"\" style=\"position: absolute; width: 60px; height: 60px; right: 0 !important; top: 0 !important;\"                 aria-hidden=\"true\"> -->     </div>     <section style=\"margin-top: 10px;\">       <div style=\"color: #000;\">         <p> Hi <candidate>, </p>         <p>Thank you for applying for the position of <b>             <jobName>           </b> at <b>             <tenantName>           </b>. We’ve successfully received your application, and it is now under review by our recruitment team. </p>         <p>We appreciate your interest in joining <tenantName>.</p>       </div>       <div style=\"margin-top: 10px; color: #000;\">         <p>Best regards,<br>           <organizer><br> HR Recruiter<br> <organizerEmail><br>               <tenantName>         </p>       </div>     </section>   </div> </body>  </html>",
  "status": "Active",
  "createdBy": "admin",
  "lastUpdatedBy": "admin"
}])

# Default Data: Client Industries- Lookup
db.lookups.insertMany([
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Administration",
      "keyValue": "Administration",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Advertising",
      "keyValue": "Advertising",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Agriculture",
      "keyValue": "Agriculture",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Architecture & Construction",
      "keyValue": "Architecture & Construction",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Arts & Graphics",
      "keyValue": "Arts & Graphics",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Airline - Aviation",
      "keyValue": "Airline - Aviation",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Accounting",
      "keyValue": "Accounting",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Automotive",
      "keyValue": "Automotive",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Banking",
      "keyValue": "Banking",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Biotechnology",
      "keyValue": "Biotechnology",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Broadcasting",
      "keyValue": "Broadcasting",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Business Management",
      "keyValue": "Business Management",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Charity",
      "keyValue": "Charity",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Catering",
      "keyValue": "Catering",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Customer Service",
      "keyValue": "Customer Service",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Chemicals",
      "keyValue": "Chemicals",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Construction",
      "keyValue": "Construction",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Computer",
      "keyValue": "Computer",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Consumer",
      "keyValue": "Consumer",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Cosmetics",
      "keyValue": "Cosmetics",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Design",
      "keyValue": "Design",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Defence",
      "keyValue": "Defence",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Electronics",
      "keyValue": "Electronics",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Engineering",
      "keyValue": "Engineering",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Energy and Utilities",
      "keyValue": "Energy and Utilities",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Entertainment",
      "keyValue": "Entertainment",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Employment - Recruiting - Staffing",
      "keyValue": "Employment - Recruiting - Staffing",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Environmental",
      "keyValue": "Environmental",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Exercise - Fitness",
      "keyValue": "Exercise - Fitness",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Export/Import",
      "keyValue": "Export/Import",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Financial Services",
      "keyValue": "Financial Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "FMCG/Foods/Beverage",
      "keyValue": "FMCG/Foods/Beverage",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Fertilizers/Pesticides",
      "keyValue": "Fertilizers/Pesticides",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Furniture",
      "keyValue": "Furniture",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Grocery",
      "keyValue": "Grocery",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Gas",
      "keyValue": "Gas",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Government",
      "keyValue": "Government",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Government/Military",
      "keyValue": "Government/Military",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Gems & Jewellery",
      "keyValue": "Gems & Jewellery",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Human Resources",
      "keyValue": "Human Resources",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Hospitality",
      "keyValue": "Hospitality",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Hotels and Lodging",
      "keyValue": "Hotels and Lodging",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "HVAC",
      "keyValue": "HVAC",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Hardware",
      "keyValue": "Hardware",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Insurance",
      "keyValue": "Insurance",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Installation",
      "keyValue": "Installation",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Industrial",
      "keyValue": "Industrial",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Internet Services",
      "keyValue": "Internet Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Import - Export",
      "keyValue": "Import - Export",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Legal",
      "keyValue": "Legal",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Logistics",
      "keyValue": "Logistics",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Landscaping",
      "keyValue": "Landscaping",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Leisure and Sport",
      "keyValue": "Leisure and Sport",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Library Science",
      "keyValue": "Library Science",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Marketing",
      "keyValue": "Marketing",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Manufacturing",
      "keyValue": "Manufacturing",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Merchandising",
      "keyValue": "Merchandising",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Medical",
      "keyValue": "Medical",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Media",
      "keyValue": "Media",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Metals",
      "keyValue": "Metals",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Mining",
      "keyValue": "Mining",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Military",
      "keyValue": "Military",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Mortgage",
      "keyValue": "Mortgage",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Marine",
      "keyValue": "Marine",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Maritime",
      "keyValue": "Maritime",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Nonprofit Charitable Organizations",
      "keyValue": "Nonprofit Charitable Organizations",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "NGO/Social Services",
      "keyValue": "NGO/Social Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Newspaper",
      "keyValue": "Newspaper",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Oil & Gas",
      "keyValue": "Oil & Gas",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Other",
      "keyValue": "Other",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Other/Not Classified",
      "keyValue": "Other/Not Classified",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Pharma",
      "keyValue": "Pharma",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Pharma/Biotech/Clinical Research",
      "keyValue": "Pharma/Biotech/Clinical Research",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Public Sector and Government",
      "keyValue": "Public Sector and Government",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Printing/Packaging/Publishing",
      "keyValue": "Printing/Packaging/Publishing",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Personal and Household Services",
      "keyValue": "Personal and Household Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Property & Real Estate",
      "keyValue": "Property & Real Estate",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Paper",
      "keyValue": "Paper",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Pet Store",
      "keyValue": "Pet Store",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Public Relations",
      "keyValue": "Public Relations",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Real Estate",
      "keyValue": "Real Estate",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Retail & Wholesale",
      "keyValue": "Retail & Wholesale",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Recreation",
      "keyValue": "Recreation",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Real Estate and Property",
      "keyValue": "Real Estate and Property",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Recruitment/Employment Firm",
      "keyValue": "Recruitment/Employment Firm",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Real Estate/Property Management",
      "keyValue": "Real Estate/Property Management",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Restaurant/Food Services",
      "keyValue": "Restaurant/Food Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Rental Services",
      "keyValue": "Rental Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Research & Development",
      "keyValue": "Research & Development",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Repair / Maintenance Services",
      "keyValue": "Repair / Maintenance Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Services",
      "keyValue": "Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Sales - Marketing",
      "keyValue": "Sales - Marketing",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Science & Technology",
      "keyValue": "Science & Technology",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Security/Law Enforcement",
      "keyValue": "Security/Law Enforcement",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Shipping/Marine",
      "keyValue": "Shipping/Marine",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Security and Surveillance",
      "keyValue": "Security and Surveillance",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Sports and Physical Recreation",
      "keyValue": "Sports and Physical Recreation",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Staffing/Employment Agencies",
      "keyValue": "Staffing/Employment Agencies",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Social Services",
      "keyValue": "Social Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Sports Leisure & Lifestyle",
      "keyValue": "Sports Leisure & Lifestyle",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Semiconductor",
      "keyValue": "Semiconductor",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Technology",
      "keyValue": "Technology",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Travel",
      "keyValue": "Travel",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Training",
      "keyValue": "Training",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Transportation",
      "keyValue": "Transportation",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Telecommunications",
      "keyValue": "Telecommunications",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Trade and Services",
      "keyValue": "Trade and Services",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Travel and Tourism",
      "keyValue": "Travel and Tourism",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Textiles/Garments/Accessories",
      "keyValue": "Textiles/Garments/Accessories",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Tyres",
      "keyValue": "Tyres",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Utilities",
      "keyValue": "Utilities",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Wireless",
      "keyValue": "Wireless",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Wood / Fibre / Paper",
      "keyValue": "Wood / Fibre / Paper",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Waste Management",
      "keyValue": "Waste Management",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  },
  {
      "tenantId": "TEN00005",
      "lookupKey": "CLIENT_INDUSTRIES",
      "keyName": "Wholesale Trade/Import-Export",
      "keyValue": "Wholesale Trade/Import-Export",
      "dataType": "string",
      "status": "Active",
      "createdBy": "SYSTEM",
      "lastUpdatedBy": "SYSTEM"
  }
])