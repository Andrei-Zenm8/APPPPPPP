import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

/**
 * A hand-drawn icon set on a 24px grid, 1.8px stroke.
 *
 * Shipping an icon font pulls ~1MB and renders differently per platform;
 * eleven inline SVGs cover the entire app and stay pixel-identical on iOS,
 * Android and web.
 */

export type IconName =
  | 'today'
  | 'program'
  | 'progress'
  | 'calendar'
  | 'people'
  | 'check'
  | 'chevron'
  | 'plus'
  | 'close'
  | 'video'
  | 'pin'
  | 'settings'
  | 'flame';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  filled?: boolean;
}

export function Icon({ name, size = 22, color, filled = false }: Props) {
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  const soft = filled ? `${color}22` : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} fill={soft} />
          <Polyline points="12,7 12,12 15.5,14" {...common} />
        </>
      )}
      {name === 'program' && (
        <>
          <Rect x={4} y={3.5} width={16} height={17} rx={3} {...common} fill={soft} />
          <Polyline points="8.5,9.5 10.5,11.5 14.5,7.5" {...common} />
          <Path d="M8.5 15.5h7" {...common} />
        </>
      )}
      {name === 'progress' && (
        <>
          <Path d="M4 19V5" {...common} />
          <Path d="M4 19h16" {...common} />
          <Polyline points="7,15 11,10.5 14,13 19,6.5" {...common} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...common} fill={soft} />
          <Path d="M3.5 10h17M8 3.5v3M16 3.5v3" {...common} />
        </>
      )}
      {name === 'people' && (
        <>
          <Circle cx={9} cy={8.5} r={3.4} {...common} fill={soft} />
          <Path d="M3.5 20c0-3.2 2.5-5.3 5.5-5.3s5.5 2.1 5.5 5.3" {...common} />
          <Path d="M16 5.6a3.4 3.4 0 0 1 0 6.4M17.5 14.9c1.9.6 3.2 2.4 3.2 5.1" {...common} />
        </>
      )}
      {name === 'check' && <Polyline points="5,12.5 10,17.5 19,7" {...common} strokeWidth={2.4} />}
      {name === 'chevron' && <Polyline points="9,5 16,12 9,19" {...common} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...common} />}
      {name === 'video' && (
        <>
          <Rect x={2.5} y={6} width={13} height={12} rx={3} {...common} fill={soft} />
          <Path d="M15.5 11l6-3.5v9l-6-3.5z" {...common} />
        </>
      )}
      {name === 'pin' && (
        <>
          <Path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" {...common} fill={soft} />
          <Circle cx={12} cy={10} r={2.6} {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3.2} {...common} />
          <Path
            d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.3z"
            {...common}
          />
        </>
      )}
      {name === 'flame' && (
        <Path
          d="M12 3s5 4.2 5 8.6a5 5 0 0 1-10 0C7 9.3 9 8 9 8s.4 2 1.6 2.6C11 9 12 6.6 12 3z"
          {...common}
          fill={soft}
        />
      )}
    </Svg>
  );
}
