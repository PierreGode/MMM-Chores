# MMM-Chores New Features

This document outlines the new features added to the MMM-Chores module, including custom repeat options, points system, rewards, and email notifications.

## 🔄 Custom Repeat Options

### New Repeat Types Available:
- **Every 2 Days** - Task repeats every 2 days after completion
- **Every 2 Weeks** - Task repeats every 2 weeks after completion  
- **First Monday of Month** - Task repeats on the first Monday of each month

### Usage:
When creating or editing a task, select from the expanded repeat dropdown menu in the admin interface.

## 🏆 Points System

### Task Points
- Each task can now be assigned a custom number of points (default: 1 point)
- Points are displayed as badges next to task names
- Points field is available when creating or editing tasks

### Earning Points
- People automatically earn points when they complete assigned tasks
- Points are distributed to the person assigned to the task
- If a task is marked as undone, points are automatically deducted
- Points are displayed next to each person's name in the admin interface

## 🎁 Rewards System

### Reward Management
- Admins can create custom rewards with point costs
- Each reward can have a name, description, and point cost
- Rewards can be edited or deleted through the admin interface

### Reward Redemption
- People can spend their earned points on available rewards
- Click the gift icon (🎁) next to a person's name to open the reward shop
- Only rewards they can afford (have enough points for) are available for redemption
- Points are automatically deducted when rewards are redeemed

### Reward Tracking
- All reward redemptions are tracked with timestamps
- Admins can mark redemptions as "used" once they've been fulfilled
- Recent redemptions are visible in the rewards management interface

## 📧 Email Notifications

### Email Setup
- Email notifications can be configured in the admin settings
- Supports SMTP with configurable host, port, security settings
- Compatible with services like Gmail, Outlook, custom SMTP servers

### Email Configuration Options:
- **SMTP Host**: Your email provider's SMTP server
- **SMTP Port**: Usually 587 for TLS or 465 for SSL
- **Security**: Enable SSL/TLS as needed
- **Username/Password**: Your email credentials
- **From/To Addresses**: Optional custom sender/recipient addresses

### Automatic Notifications
- When someone redeems a reward, an email is automatically sent
- Email includes the person's name, reward details, and timestamp
- Helps admins track when rewards need to be fulfilled

## 🛠 Installation and Setup

### Installing Email Dependencies (Optional)
To enable email notifications, install nodemailer:
```bash
cd ~/MagicMirror/modules/MMM-Chores
npm install nodemailer
```

### Configuration
1. **Points are enabled by default** - no configuration needed
2. **Rewards** - Add rewards through the admin interface ("Manage Rewards" button)
3. **Email** - Configure through "Email Settings" button in admin interface

## 📱 Admin Interface Updates

### New Buttons and Interfaces:
- **Points field** in task creation/editing forms
- **Manage Rewards** button in settings
- **Email Settings** button in settings  
- **Gift icon** next to people for reward shopping
- **Points badges** displayed throughout the interface

### New Modals:
- **Reward Shop** - Where people can spend points
- **Manage Rewards** - Admin interface for reward management
- **Email Settings** - Email configuration interface

## 🔧 Technical Details

### Data Structure Changes:
- Tasks now include a `points` field (integer, default: 1)
- People now include a `points` field (integer, default: 0)
- New `rewards` array with reward definitions
- New `rewardRedemptions` array tracking redemption history

### API Endpoints Added:
- `GET/POST/PUT/DELETE /api/rewards` - Reward management
- `GET/POST/PUT /api/redemptions` - Redemption management
- Enhanced `/api/settings` to include email configuration

### Backward Compatibility:
- All existing functionality remains unchanged
- Existing tasks automatically get 1 point assigned
- Existing people start with 0 points
- New features are additive and don't break existing installations

## 💡 Usage Tips

1. **Point Balancing**: Start with 1-point tasks and adjust based on difficulty
2. **Reward Pricing**: Price rewards appropriately (e.g., small treat = 5 points, big reward = 50 points)
3. **Email Testing**: Test email configuration with a test redemption
4. **Regular Review**: Check redemption history to ensure rewards are being fulfilled

## 🐛 Troubleshooting

### Email Not Working:
1. Verify SMTP settings are correct
2. Check that nodemailer is installed: `npm list nodemailer`
3. Ensure email credentials are valid
4. Check server logs for error messages

### Points Not Updating:
1. Ensure tasks have points assigned (check edit modal)
2. Verify people are properly assigned to tasks
3. Check that tasks are being marked as complete

### Rewards Not Appearing:
1. Ensure rewards have been created in "Manage Rewards"
2. Check that people have sufficient points
3. Verify reward shop modal is loading properly

This completes the implementation of all requested features for the MMM-Chores module!