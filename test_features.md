# Test Plan for New MMM-Chores Features

## 🧪 Test Cases

### 1. Enhanced Recurring Tasks
- [ ] Create task with "Every 2 Days" - verify next occurrence is 2 days later
- [ ] Create task with "Every 3 Days" - verify next occurrence is 3 days later  
- [ ] Create task with "Every 2 Weeks" - verify next occurrence is 2 weeks later
- [ ] Create task with "Every 3 Weeks" - verify next occurrence is 3 weeks later
- [ ] Create task with "First Monday of Month" - verify next occurrence is first Monday of next month
- [ ] Complete recurring task and verify new instance is created with correct date

### 2. Point System Migration
- [ ] Toggle "Use Point System" on - verify UI switches to point mode
- [ ] Toggle "Use Point System" off - verify UI switches back to level mode
- [ ] Verify existing people get calculated points when switching to point system
- [ ] Verify level display remains when in level mode

### 3. Task Points Assignment
- [ ] Create task without specifying points - verify defaults to 1 point
- [ ] Create task with custom points (e.g., 5) - verify point badge displays
- [ ] Edit existing task to change point value
- [ ] Verify point badge only shows when points > 1

### 4. Point Earning
- [ ] Complete task assigned to person - verify points are awarded
- [ ] Complete task worth 3 points - verify person gets 3 points
- [ ] Complete unassigned task - verify no points awarded
- [ ] Complete task multiple times - verify points accumulate

### 5. Reward Management
- [ ] Create new reward with name and point cost
- [ ] Edit existing reward - change name, points, description
- [ ] Toggle reward active/inactive status
- [ ] Delete reward - confirm it's removed from lists

### 6. Reward Redemption
- [ ] Attempt redemption with insufficient points - verify error message
- [ ] Successfully redeem reward with sufficient points - verify points deducted
- [ ] Verify redemption appears in "Recent Redemptions" list
- [ ] Mark redemption as "used" - verify status changes

### 7. UI Language Support
- [ ] Switch language - verify new tab "Rewards" appears in selected language
- [ ] Verify recurring options show in selected language
- [ ] Verify point system labels appear in selected language

### 8. Data Persistence
- [ ] Create rewards and redemptions - restart server - verify data persists
- [ ] Switch point system on/off - restart - verify setting persists
- [ ] Complete tasks for points - restart - verify point balances persist

### 9. Admin Interface
- [ ] Verify "Rewards" tab appears and is functional
- [ ] Verify point system toggle works
- [ ] Verify people points display updates in real-time
- [ ] Verify redemption history displays correctly

### 10. Error Handling
- [ ] Try to redeem with invalid person/reward - verify graceful error
- [ ] Try to create reward with no name - verify validation
- [ ] Try to create reward with negative points - verify validation

## 🔍 Performance Tests
- [ ] Load test with 100+ tasks - verify UI remains responsive
- [ ] Test point calculations with many completed tasks
- [ ] Test with multiple redemptions - verify list performance

## 🔒 Security Tests
- [ ] Verify API endpoints require proper authentication
- [ ] Verify write permissions are enforced for reward management
- [ ] Verify user can only redeem rewards for valid people

## 📱 Browser Compatibility
- [ ] Test in Chrome - verify all features work
- [ ] Test in Firefox - verify all features work  
- [ ] Test in Safari - verify all features work
- [ ] Test on mobile devices - verify responsive design

## ⚠️ Edge Cases
- [ ] Person with exactly the required points for a reward
- [ ] Reward with 0 point cost
- [ ] Tasks with very high point values (1000+)
- [ ] Multiple redemptions of same reward by same person
- [ ] Switching systems with existing point balances

## 🐛 Known Issues to Test
- [ ] Verify task points field accepts only positive integers
- [ ] Verify recurring task generation doesn't create duplicates
- [ ] Verify point calculations are accurate for existing completed tasks
- [ ] Verify email functionality (if configured)

## 📋 Manual Testing Steps

### Basic Workflow Test
1. Start with clean installation
2. Add 2-3 people
3. Enable point system
4. Create mix of regular and recurring tasks with varying points
5. Complete some tasks and verify points are awarded
6. Create some rewards with different point costs
7. Redeem rewards and verify point deduction
8. Mark some redemptions as used
9. Switch back to level system and verify it works
10. Switch back to point system and verify data is preserved

### Recurring Task Test  
1. Create task for "tomorrow" with "Every 2 Days" recurring
2. Complete the task
3. Verify new instance is created for 2 days after tomorrow
4. Test each new recurring option similarly

### Multi-User Test
1. Create multiple people
2. Assign different tasks to different people
3. Complete tasks as different people
4. Verify points are awarded to correct people
5. Test redemptions for different people
6. Verify redemption history shows correct person names

## ✅ Success Criteria
- All basic functionality works without errors
- Data persists across server restarts  
- UI is responsive and intuitive
- Point calculations are accurate
- Reward system works as expected
- Backward compatibility is maintained
- No performance degradation with new features