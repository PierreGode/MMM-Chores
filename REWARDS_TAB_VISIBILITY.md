# Rewards Tab Visibility Control

## Overview
The Rewards tab can now be shown or hidden from the admin interface based on user preference. This provides better control over the UI, especially when the point system is not being used.

## Implementation Details

### 1. Settings Configuration

**Location:** Settings Modal → Display Settings Section

A new checkbox control has been added:
- **Label:** "Show Rewards tab"
- **Setting ID:** `settingsShowRewardsTab`
- **Default Value:** `false` (tab is hidden by default)

### 2. Backend Storage

**File:** `node_helper.js`

The `showRewardsTab` setting is now persisted in the settings object:

```javascript
settings = {
  // ... other settings
  showRewardsTab: settings.showRewardsTab ?? payload.showRewardsTab ?? false,
  // ...
};
```

### 3. Frontend Implementation

**File:** `admin.js`

#### New Function: `updateRewardsTabNavVisibility(show)`

This function controls the visibility of the Rewards navigation tab:

```javascript
function updateRewardsTabNavVisibility(show) {
  const rewardsNavItem = document.querySelector('.nav-link[href="#rewardsTab"]')?.parentElement;
  if (rewardsNavItem) {
    if (show) {
      rewardsNavItem.classList.remove('d-none');
    } else {
      rewardsNavItem.classList.add('d-none');
      // If rewards tab is active, switch to tasks tab
      const rewardsTab = document.getElementById('rewardsTab');
      if (rewardsTab && rewardsTab.classList.contains('active')) {
        document.querySelector('.nav-link[href="#tasksTab"]').click();
      }
    }
  }
}
```

#### Features:
- **Instant Feedback:** Checkbox changes immediately show/hide the tab
- **Smart Navigation:** If the Rewards tab is active when hidden, automatically switches to Tasks tab
- **Persistence:** Setting is saved to backend and persists across sessions

### 4. HTML Structure

**File:** `admin.html`

The Rewards tab navigation item starts hidden by default:

```html
<li class="nav-item d-none">
  <a class="nav-link" data-bs-toggle="tab" href="#rewardsTab" id="rewardsNavLink">
    <span data-lang="tabs[2]">Rewards</span>
  </a>
</li>
```

## User Workflow

### Enabling the Rewards Tab

1. Open Settings (⚙️ icon)
2. Navigate to "Display Settings" section
3. Check "Show Rewards tab"
4. The Rewards tab appears immediately in the navigation
5. Click "Save Settings" to persist the change

### Disabling the Rewards Tab

1. Open Settings (⚙️ icon)
2. Navigate to "Display Settings" section
3. Uncheck "Show Rewards tab"
4. The Rewards tab disappears immediately from navigation
5. If you were on the Rewards tab, you'll be automatically switched to Tasks
6. Click "Save Settings" to persist the change

## Integration with Point System

The Rewards tab visibility is **independent** of the point system selection:

- **Level System (default):** Rewards tab is hidden by default, but can be manually shown
- **Point System:** Rewards tab is hidden by default, but can be manually shown

This allows users to:
- Preview the Rewards interface before switching to the point system
- Hide the Rewards tab even when using the point system (if they manage rewards externally)
- Keep a cleaner interface when rewards are not needed

## Technical Notes

### Relationship Between Functions

There are now two separate functions for Rewards tab control:

1. **`updateRewardsTabVisibility(usePointSystem)`**
   - Controls the *content* within the Rewards tab
   - Shows "enabled" or "disabled" message based on system selection
   - Located in Rewards tab content area

2. **`updateRewardsTabNavVisibility(show)`**
   - Controls the *navigation tab* visibility
   - Shows/hides the entire Rewards tab from the navigation bar
   - Independent of system selection

### Event Flow

```
User changes checkbox
  ↓
onChange event fires
  ↓
updateRewardsTabNavVisibility() called
  ↓
Tab shows/hides immediately
  ↓
User clicks Save Settings
  ↓
Setting saved to backend
  ↓
Setting persists across sessions
```

## Backward Compatibility

- **Existing installations:** Rewards tab will be hidden by default (safe default)
- **No breaking changes:** All existing functionality remains intact
- **Opt-in behavior:** Users must explicitly enable the tab if they want it

## Files Modified

1. `node_helper.js` - Added `showRewardsTab` to settings initialization
2. `public/admin.html` - Added checkbox control in Display Settings section
3. `public/admin.js` - Added `updateRewardsTabNavVisibility()` function and event handlers
4. `public/admin.html` - Added `d-none` class to Rewards nav item by default

## Testing Checklist

- [x] Checkbox toggles tab visibility immediately
- [x] Setting persists after page reload
- [x] Active Rewards tab switches to Tasks when hidden
- [x] Tab can be shown/hidden regardless of system selection
- [x] No console errors when toggling visibility
- [x] Setting saves correctly to backend
