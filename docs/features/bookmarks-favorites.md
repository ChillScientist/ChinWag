# Bookmarks and Favorites

## Overview
The chat interface now supports both Bookmarks and Favorites to help users organize and quickly access their chat sessions. These features serve distinct purposes:

- **Bookmarks**: Used for temporarily marking sessions you need to return to later. Ideal for work-in-progress conversations or reference material.
- **Favorites**: Used for permanently marking particularly valuable or frequently accessed sessions. Perfect for completed conversations you want to keep easily accessible.

## Features

### Visual Indicators
- Bookmarks are indicated by a blue bookmark icon (🔖)
- Favorites are indicated by a yellow star icon (⭐)
- Both states can be toggled independently for any session

### Filtering
Sessions can be filtered in three ways:
1. Using the Bookmarked/Favorites filter buttons in the search bar
2. Using search operators
3. Using the quick filter buttons at the top of the session list

### Search Integration
The search functionality includes special operators for bookmarks and favorites:
- `type:bookmarked` - Show only bookmarked sessions
- `type:favorite` - Show only favorite sessions

These operators can be combined with other search terms and operators:
```
type:bookmarked tag:work        # Search bookmarked sessions with 'work' tag
type:favorite in:"python code"   # Search favorite sessions containing 'python code'
```

## Usage

### Managing Bookmarks and Favorites
1. In the sessions sidebar, hover over any session
2. Click the bookmark icon (🔖) to toggle bookmark status
3. Click the star icon (⭐) to toggle favorite status

### Filtering Sessions
Quick Filters:
1. Use the "All/Bookmarked/Favorites" buttons at the top of the session list
2. Sessions will be instantly filtered based on your selection

Search Filters:
1. Click into the search bar
2. Type `type:bookmarked` or `type:favorite`
3. Combine with other search terms as needed

### Persistence
- Bookmark and favorite states are automatically saved to local storage
- States persist across browser sessions
- States are preserved when renaming or editing sessions

## Technical Implementation

### Session Type
The ChatSession type has been extended with two new boolean flags:
```typescript
interface ChatSession {
  // ...existing fields
  isBookmarked?: boolean;
  isFavorite?: boolean;
}
```

### Local Storage
Bookmark and favorite states are automatically synchronized with local storage as part of the session data. No additional storage configuration is required.

### Search Integration
The search functionality has been extended with a new 'type' operator that specifically handles bookmark and favorite filters. This operator is processed alongside existing search operators (system, name, tag, note, in).

## Best Practices

1. Use bookmarks for:
   - Ongoing conversations you need to return to
   - Reference material you're actively using
   - Temporary markers for work in progress

2. Use favorites for:
   - High-quality completed conversations
   - Frequently accessed reference material
   - Important templates or examples
   - Sessions you want to keep permanently accessible

3. Organization Tips:
   - Regularly review and clear unnecessary bookmarks
   - Use favorites sparingly for truly important sessions
   - Combine with tags for better organization
   - Use search operators to find specific bookmarked/favorited content

## Limitations

- Sessions can be both bookmarked and favorited simultaneously
- There is no limit to the number of bookmarked or favorited sessions
- States are stored locally and not synced across devices