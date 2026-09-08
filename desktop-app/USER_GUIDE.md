# Retail CRM Desktop - User Guide

## Installation

1. Download and run `Retail CRM Setup 1.0.0.exe`
2. Follow the installation wizard
3. Choose installation directory
4. Click Install

## First Time Setup

When you first launch Retail CRM, you'll see a setup wizard:

### Step 1: Database Configuration

Enter your MySQL database information:
- **Host**: Usually `localhost` (default)
- **Port**: Usually `3306` (default)
- **Database Name**: `retail_crm` (will be created if doesn't exist)
- **Username**: Your MySQL username (usually `root`)
- **Password**: Your MySQL root password ⚠️ **Required**

Click **Test & Continue** to verify the connection and initialize the database.

### Step 2: Create Admin Account

Set up your administrator account:
- **Full Name**: Your name
- **Email**: Your email address (used for login)
- **Password**: At least 8 characters
- **Language**: Choose Arabic, French, or English

Click **Create & Continue** to create your admin account.

### Step 3: Launch

Click **Launch Application** to start using Retail CRM!

The application will open in your browser at `http://localhost:3000`

## Daily Use

After setup is complete, simply:
1. Launch "Retail CRM" from your desktop or Start Menu
2. Wait a few seconds for the application to start
3. Your browser will open automatically
4. Log in with your admin email and password

## System Requirements

- **Operating System**: Windows 10 or later (64-bit)
- **MySQL**: Version 5.7 or higher (must be installed separately)
- **RAM**: Minimum 4GB, recommended 8GB
- **Disk Space**: 500MB for application + database storage
- **Ports**: 3000 and 3001 must be available

## Troubleshooting

### "Cannot connect to database"
- Verify MySQL is running (check Services)
- Verify your MySQL password is correct
- Check if port 3306 is accessible

### "Port 3000 already in use"
- Close other applications using port 3000
- Or change the port in the configuration

### Application won't start
- Check Windows Firewall settings
- Verify Node.js processes aren't stuck (Task Manager)
- Restart your computer

### Need to reconfigure?
Delete the configuration file:
1. Press `Win + R`
2. Type: `%APPDATA%\retail-crm-desktop`
3. Delete `config.enc`
4. Restart the application

## Support

For technical support, contact your system administrator.

## Uninstallation

1. Go to Settings → Apps
2. Find "Retail CRM"
3. Click Uninstall
4. Note: This does NOT delete your database data
