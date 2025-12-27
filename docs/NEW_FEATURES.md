# New Features Added to MMM-Chores

## Overview
This update adds a comprehensive point-based reward system and enhanced recurring task options to MMM-Chores, while maintaining backward compatibility with the existing level-based system.

## ✨ New Features

### 1. Enhanced Recurring Task Options
- **Every X Days**: Create tasks that repeat every 2, 3, or more days
- **Every X Weeks**: Create tasks that repeat every 2, 3, or more weeks  
- **First Monday of Month**: Tasks that occur on the first Monday of each month
- All existing recurring options (daily, weekly, monthly, yearly) remain available

### 2. Point-Based Reward System
A complete alternative to the traditional level system that allows for more granular reward management.

#### Key Features:
- **Custom Points per Task**: Each chore can be assigned a custom point value (default: 1 point)
- **Automatic Point Calculation**: Points are automatically awarded when tasks are completed
- **Point Distribution**: Points are awarded to the person assigned to the task
- **Flexible Rewards**: Create custom rewards with specific point costs

### 3. Reward Management
- **Create Custom Rewards**: Admin can create rewards with custom point costs
- **Reward Descriptions**: Optional descriptions for each reward
- **Email Templates**: Optional email templates sent when rewards are redeemed
- **Active/Inactive Rewards**: Toggle rewards on/off without deleting them

### 4. Reward Redemption System
- **Point Spending**: People can spend their earned points on available rewards
- **Redemption Tracking**: All redemptions are tracked with timestamps
- **Email Notifications**: Optional email notifications when rewards are redeemed
- **Usage Tracking**: Admins can mark redemptions as "used"

### 5. System Migration Options
- **Dual System Support**: Choose between traditional level system or new point system
- **Backward Compatibility**: Existing level system remains as default
- **Seamless Migration**: Existing users can opt-in to point system
- **Data Preservation**: All existing data is preserved during migration

## 🔧 Technical Implementation

### New API Endpoints

#### Rewards Management
- `GET /api/rewards` - List all rewards
- `POST /api/rewards` - Create new reward
- `PUT /api/rewards/:id` - Update existing reward  
- `DELETE /api/rewards/:id` - Delete reward

#### Redemptions
- `GET /api/redemptions` - List all redemptions
- `POST /api/redemptions` - Redeem a reward
- `PUT /api/redemptions/:id/use` - Mark redemption as used

#### Points
- `GET /api/people/:id/points` - Get person's point balance

### New Data Structures

#### Task Object Extensions
```json
{
  "id": 123,
  "name": "Clean Kitchen",
  "points": 3,
  "recurring": "every_X_days_2",
  // ... existing fields
}
```

#### Reward Object
```json
{
  "id": 456,
  "name": "Extra Screen Time",
  "pointCost": 50,
  "description": "30 minutes extra screen time",
  "emailTemplate": "Enjoy your extra screen time!",
  "active": true,
  "created": "2025-01-01T12:00:00Z"
}
```

#### Redemption Object
```json
{
  "id": 789,
  "rewardId": 456,
  "personId": 123,
  "rewardName": "Extra Screen Time",
  "personName": "John",
  "pointCost": 50,
  "redeemed": "2025-01-01T12:00:00Z",
  "used": false,
  "emailSent": true
}
```

#### Person Object Extensions
```json
{
  "id": 123,
  "name": "John",
  "points": 150,
  // ... existing fields
}
```

### New Settings
- `usePointSystem`: Boolean - Enable/disable point system
- `emailEnabled`: Boolean - Enable/disable email notifications

## 🎯 Usage Guide

### For Administrators

#### Enabling Point System
1. Go to the Rewards tab in admin interface
2. Toggle "Use Point System" switch
3. System will automatically calculate existing points based on completed tasks

#### Creating Rewards
1. In the Rewards tab, enter reward details:
   - Name (required)
   - Point cost (required)
   - Description (optional)
   - Email template (optional)
2. Click "Add Reward"

#### Managing Redemptions
1. View recent redemptions in the "Recent Redemptions" section
2. Mark redemptions as "used" when appropriate
3. Track point balances for all users

#### Setting Task Points
1. When creating tasks, specify point value in the "Points" field
2. Default is 1 point if not specified
3. Higher point values for more difficult/important tasks

#### Using Enhanced Recurring Options
1. In task creation form, select from new recurring options:
   - "Every 2 Days", "Every 3 Days"
   - "Every 2 Weeks", "Every 3 Weeks" 
   - "First Monday of Month"

### For Users

#### Viewing Points
- Points are displayed next to each person's name
- Points are automatically updated when tasks are completed

#### Redeeming Rewards
1. Click "Redeem" button next to a person's name
2. Select person and desired reward
3. System checks if sufficient points are available
4. Confirm redemption

## 🔄 Migration Path

### From Level System to Point System
1. **Backup Data**: System automatically backs up existing data
2. **Enable Point System**: Toggle the switch in admin interface
3. **Point Calculation**: System calculates points based on completed tasks
4. **Create Rewards**: Set up custom rewards to replace level titles
5. **Gradual Transition**: Both systems can coexist during transition

### Rollback Option
- Disable point system to return to level-based rewards
- All data is preserved, allowing seamless switching between systems

## ⚙️ Configuration

### Email Setup (Optional)
To enable email notifications for reward redemptions:

1. Configure email service in your server environment
2. Set `emailEnabled: true` in config
3. Customize email templates per reward

### Custom Points Strategy
- **Simple**: 1 point per task (default)
- **Difficulty-based**: 1-3 points based on task complexity
- **Time-based**: Points proportional to estimated time
- **Importance-based**: Higher points for critical tasks

## 🚀 Benefits

### For Families
- **Motivation**: Clear point system encourages task completion
- **Fairness**: Transparent reward system based on contribution
- **Flexibility**: Customize rewards for different family members
- **Engagement**: Gamification increases participation

### For Organizations
- **Tracking**: Detailed analytics on task completion and rewards
- **Customization**: Tailor point values and rewards to organizational goals
- **Reporting**: Comprehensive redemption and usage tracking
- **Scalability**: System scales with organization size

## 🔧 Backward Compatibility

- **Existing Users**: Continue using level system by default
- **Data Preservation**: All existing tasks, people, and analytics preserved
- **Gradual Migration**: Can switch between systems at any time
- **Feature Overlap**: Both systems can coexist indefinitely

## 📋 Future Enhancements

Potential future additions:
- **Point Multipliers**: Bonus points for consecutive days
- **Seasonal Rewards**: Time-limited special rewards
- **Group Rewards**: Family/team rewards requiring combined points
- **Achievement System**: Badges and milestones
- **Point Decay**: Optional point expiration for active engagement
- **Advanced Scheduling**: More complex recurring patterns
- **Reward Categories**: Organize rewards by type/category
- **Point Transfer**: Allow sharing points between family members

## 🐛 Known Limitations

- Email functionality requires additional server configuration
- Point calculations are based on task completion, not task difficulty verification
- Large point balances may require UI adjustments for display
- Custom recurring patterns are limited to predefined options

## 📞 Support

For questions or issues with the new features:
1. Check the existing documentation
2. Review the admin interface tooltips
3. Test in a non-production environment first
4. Report issues through the standard channels

---

**Note**: This is a major feature update. Please test thoroughly in a development environment before deploying to production.
