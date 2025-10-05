# Custom Window Controls Documentation

## Overview

This document outlines the implementation plan for custom window controls in Porter, replacing the native Windows title bar with a sleek, modern custom design.

## Why Custom Window Controls?

- **Consistent UI**: Match the app's design language across all platforms
- **Modern Look**: Create a more polished, professional appearance
- **Better Integration**: Seamlessly blend with dark/light themes
- **Extended Functionality**: Add custom actions to the title bar

## Design Specifications

### Title Bar Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Icon] Porter - Port Monitor          [─] [□] [×]         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Rest of the application content]                          │
│                                                              │
```

### Components

1. **App Icon & Title** (Left)
   - Porter icon (24x24px)
   - "Porter - Port Monitor" text
   - Font: 14px, medium weight

2. **Window Controls** (Right)
   - Minimize button (─)
   - Maximize/Restore button (□/◱)
   - Close button (×)
   - Each button: 46px wide × 32px tall

### Color Scheme

#### Light Mode
- Background: `hsl(0 0% 100%)` (white)
- Border: `hsl(0 0% 89.8%)` (light gray)
- Text: `hsl(0 0% 3.9%)` (near black)
- Hover: `hsl(0 0% 96.1%)` (light gray)
- Close button hover: `hsl(0 84.2% 60.2%)` (red)

#### Dark Mode
- Background: `hsl(0 0% 10%)` (#191919)
- Border: `hsl(217 33% 17%)` (dark gray)
- Text: `hsl(210 40% 98%)` (off-white)
- Hover: `hsl(217 33% 17%)` (dark gray)
- Close button hover: `hsl(0 63% 31%)` (dark red)

## Technical Implementation

### 1. Tauri Configuration

Update `src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "windows": [{
      "decorations": false,
      "titleBarStyle": "Overlay"
    }]
  }
}
```

### 2. React Component Structure

Create `src/components/TitleBar.tsx`:

```tsx
import { appWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div data-tauri-drag-region className="titlebar">
      {/* Icon and title */}
      {/* Window controls */}
    </div>
  );
}
```

### 3. Draggable Region

- Apply `data-tauri-drag-region` attribute to title bar
- Exclude window control buttons from drag region
- Handle double-click to maximize/restore

### 4. Window State Management

Track window states:
- Normal
- Maximized
- Minimized
- Fullscreen (if applicable)

Update maximize button icon based on state.

## Platform Considerations

### Windows
- ✅ Full support for custom title bars
- Handle Windows Snap Assist
- Support Windows 11 rounded corners
- Proper handling of DWM blur

### macOS
- Traffic light buttons (close, minimize, maximize)
- Consider native macOS style
- Handle unified title/toolbar style

### Linux
- Handle different window managers (GNOME, KDE, etc.)
- Fallback to native controls if needed

## Accessibility

1. **Keyboard Navigation**
   - Tab through window controls
   - Enter/Space to activate buttons
   - Alt+F4 to close (Windows)

2. **Screen Readers**
   - Proper ARIA labels for buttons
   - Announce window state changes

3. **High Contrast Mode**
   - Respect OS high contrast settings
   - Ensure adequate color contrast

## Implementation Steps

### Phase 1: Basic Structure
1. Disable native decorations in Tauri config
2. Create TitleBar component
3. Implement draggable region
4. Add window control buttons

### Phase 2: Styling
1. Apply theme-based styling
2. Add hover effects
3. Implement smooth transitions
4. Handle maximize state icon switching

### Phase 3: Platform Integration
1. Test on Windows 10/11
2. Implement macOS-specific styling
3. Add Linux support
4. Handle edge cases (multi-monitor, etc.)

### Phase 4: Polish
1. Add custom animations
2. Implement context menu (right-click title bar)
3. Add window menu (optional)
4. Performance optimization

## API Reference

### Tauri Window API

```typescript
import { appWindow } from '@tauri-apps/api/window';

// Window controls
await appWindow.minimize();
await appWindow.toggleMaximize();
await appWindow.close();

// Window state
const isMaximized = await appWindow.isMaximized();
const isFullscreen = await appWindow.isFullscreen();

// Events
appWindow.listen('tauri://resize', () => {
  // Handle window resize
});
```

## Testing Checklist

- [ ] Title bar renders correctly
- [ ] Drag to move window works
- [ ] Minimize button works
- [ ] Maximize/Restore button works
- [ ] Close button works
- [ ] Double-click to maximize works
- [ ] Theme switching works
- [ ] Multi-monitor support works
- [ ] Windows Snap Assist works
- [ ] High DPI displays work
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility

## Resources

- [Tauri Window Customization](https://tauri.app/v1/guides/features/window-customization)
- [Custom Title Bar Examples](https://github.com/tauri-apps/tauri/tree/dev/examples/window-customization)
- [Windows Title Bar Guidelines](https://learn.microsoft.com/en-us/windows/apps/design/shell/title-bar)

## Notes

- Custom title bars increase bundle size slightly
- Requires additional testing across platforms
- May need platform-specific CSS adjustments
- Consider user preference for native controls (future feature)
