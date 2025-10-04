import React from 'react';

type IconProps = {
  className?: string;
  title?: string;
};

const getAccessibilityProps = (title?: string) =>
  title
    ? { role: 'img' as const }
    : ({ role: 'img' as const, 'aria-hidden': true as const } as const);

const renderTitle = (title?: string) => (title ? <title>{title}</title> : null);

export const FracturedLoopLogo: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const infinityId = `${gradientId}-infinity`;

  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={infinityId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M30 60c0-16.6 13.4-30 30-30s30 13.4 30 30c0 16.6-13.4 30-30 30s-30-13.4-30-30zM60 30c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20z"
          fill={`url(#${infinityId})`}
          stroke="hsl(var(--ink))"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M45 45c5-5 13-5 18 0s5 13 0 18-13 5-18 0-5-13 0-18z"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M75 45c5-5 13-5 18 0s5 13 0 18-13 5-18 0-5-13 0-18z"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="54" cy="54" r="3" fill="hsl(var(--ink))" />
        <circle cx="66" cy="54" r="3" fill="hsl(var(--ink))" />
        <path
          d="M42 78h36"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />
      </g>
    </svg>
  );
};

export const ChatBubbleLeftRightIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-chat-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M5.4 4.2h7.9c1.6 0 2.9 1.3 2.9 2.9v3.8c0 1.6-1.3 2.9-2.9 2.9h-1.6l-3.3 3-.4-3H7.1c-1.6 0-2.9-1.3-2.9-2.9V7.1C4.2 5.5 4.6 4.2 5.4 4.2z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--ink))"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M14.4 11c.7-.7 1.6-1.1 2.6-1.1 1.9 0 3.5 1.4 3.5 3.2 0 1.1-.6 2.1-1.5 2.7l.6 2.7-3-1.8c-2 0-3.6-1.5-3.6-3.3 0-.8.2-1.5.7-2.1"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M6.3 6.2h6.5"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M6.3 8.8h5"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <rect
          x="15"
          y="5"
          width="4.6"
          height="1.6"
          rx="0.6"
          fill="hsl(var(--accent))"
          transform="rotate(-12 15 5)"
        />
        <circle cx="9.2" cy="12.2" r="1" fill="hsl(var(--card))" />
        <circle cx="11.5" cy="12.2" r="1" fill="hsl(var(--card))" />
        <circle cx="7" cy="12.2" r="1" fill="hsl(var(--card))" />
      </g>
    </svg>
  );
};

export const ArrowRightOnRectangleIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-exit-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="3.5"
          y="4.2"
          width="10.5"
          height="15.6"
          rx="2.4"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
        />
        <path
          d="M5.8 8.4h6.4v6.4H5.8z"
          fill="none"
          stroke="hsl(var(--secondary-foreground))"
          strokeWidth="1"
          strokeDasharray="2 1.2"
        />
        <path
          d="M12.2 12h6.2"
          stroke={`url(#${fillId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M15.7 9.2l3 2.8-3 2.8"
          fill="none"
          stroke={`url(#${fillId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.4 6.4l3.4-2.4 1.6 2.4"
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const CubeTransparentIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const faceId = `${gradientId}-cube-face`;
  const edgeId = `${gradientId}-cube-edge`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={faceId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--card))" />
        </linearGradient>
        <linearGradient id={edgeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M12 3l7.2 4.2v9.6L12 21 4.8 16.8V7.2z"
          fill={`url(#${faceId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M12 3v18"
          stroke="hsl(var(--ink))"
          strokeWidth="1.2"
          strokeDasharray="2.6 1.6"
        />
        <path
          d="M4.8 7.2l7.2 4.2 7.2-4.2"
          fill="none"
          stroke={`url(#${edgeId})`}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="12" cy="11.4" r="1.2" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="0.9" />
        <path
          d="M7.2 14.8h2.8v2.8H7.2z"
          fill="hsl(var(--accent))"
          opacity="0.8"
        />
      </g>
    </svg>
  );
};

export const DocumentTextIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-doc-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M6.4 3.6h7.1l3.7 3.7V20c0 1.3-1.1 2.4-2.4 2.4H6.4C5.1 22.4 4 21.3 4 20V5.9C4 4.6 5.1 3.6 6.4 3.6z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M13.2 3.6v3.9h3.9"
          fill="none"
          stroke="hsl(var(--ink))"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.8 10.2h8.4"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M7.8 13.3h5.7"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M7.8 16.5h6.9"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M9 6.3h4.3"
          stroke="hsl(var(--accent))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M15.6 15.6l2.6 1.4-2.6 1.4"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const FilmIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const boardId = `${gradientId}-board`;
  const panelId = `${gradientId}-panel`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={boardId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
        <linearGradient id={panelId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M4.2 7.5L16.5 4l3.3 2.8v10.8l-12.3 3.5-3.3-2.8z"
          fill={`url(#${boardId})`}
          stroke="hsl(var(--ink))"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M4.2 10.4l12.3-3.5v7.6L4.2 18z"
          fill={`url(#${panelId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M5.7 11.6h4.2v3.2H5.7zM11.2 10.1h4.2v3.2h-4.2z"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
        />
        <path
          d="M15 4l3.8 3.4"
          stroke="hsl(var(--accent))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M7.3 5.7l3.6-1"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M17.1 12.8c1.5-.7 3 .2 3.2 1.8.1.8-.2 1.6-.8 2.2l.5 2.2-2.6-1.5c-1.6.1-3-1.1-3-2.7 0-1.2.7-2.3 1.7-2.7z"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const PhotoIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const frameId = `${gradientId}-photo-frame`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={frameId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="3.5"
          y="4"
          width="17"
          height="15.5"
          rx="2.6"
          fill={`url(#${frameId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
        />
        <path
          d="M4.8 15.5l3.6-3.9c.5-.6 1.4-.6 1.9 0l1.9 2.1 2.9-3.1c.5-.5 1.3-.4 1.8.1l2.3 2.8"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.6" cy="8.6" r="2.1" fill="hsl(var(--card))" stroke="hsl(var(--primary-foreground))" strokeWidth="1.1" />
        <path
          d="M6.2 5.6h6.8"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="1.4 1.4"
        />
        <path
          d="M5 18.5l2.2 2.5 2.1-2.5"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const ArrowUturnLeftIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const arrowId = `${gradientId}-uturn-arrow`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={arrowId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M18.5 6.2h-4.8c-3.8 0-6.9 3.1-6.9 6.9v1.1L4 11.7l3.4-4.8"
          fill="none"
          stroke={`url(#${arrowId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.8 6.2c3.8 0 6.9 3.1 6.9 6.9s-3.1 6.9-6.9 6.9H9"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="3 1.4"
        />
        <circle cx="13.8" cy="13.1" r="2.2" fill="hsl(var(--card))" stroke="hsl(var(--primary-foreground))" strokeWidth="1" />
        <path
          d="M12.6 12l1.2 1.2 1.6-1.6"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const QuestionMarkCircleIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-question-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <radialGradient id={fillId} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </radialGradient>
      </defs>
      <g>
        <circle
          cx="12"
          cy="12"
          r="9"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
        />
        <path
          d="M8.6 9.2c.5-1.7 2-2.8 3.7-2.8 2.1 0 3.8 1.5 3.8 3.5 0 1.6-1 2.4-2.1 3.2-.8.6-1.3 1.1-1.3 2"
          fill="none"
          stroke="hsl(var(--ink))"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17.4" r="1.1" fill="hsl(var(--card))" />
        <path
          d="M7 6.8l2-2.3 2.1 1.2"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const ScissorsIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-scissors-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <circle cx="6.4" cy="7" r="3.1" fill={`url(#${fillId})`} stroke="hsl(var(--ink))" strokeWidth="1.2" />
        <circle cx="17.6" cy="7" r="3.1" fill={`url(#${fillId})`} stroke="hsl(var(--ink))" strokeWidth="1.2" />
        <path
          d="M6 9.8l6.1 4.5 5.9-4.5M12.1 14.3l5.3 7"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 14.3L6.6 21"
          fill="none"
          stroke="hsl(var(--secondary-foreground))"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M4.2 11.5h15.8"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="2 1"
        />
      </g>
    </svg>
  );
};

export const VideoCameraIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const bodyId = `${gradientId}-camera-body`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={bodyId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="3.5"
          y="6"
          width="13"
          height="11.5"
          rx="2.4"
          fill={`url(#${bodyId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
        />
        <circle cx="9.8" cy="11.8" r="2.9" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1.2" />
        <path
          d="M16.5 9l4-2.4v9l-4-2.4z"
          fill="hsl(var(--accent))"
          stroke="hsl(var(--ink))"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.8 8.4h4.6"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M4.8 16.2l2.4 2.4 2.3-2.4"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const SparklesIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-spark-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="60%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </radialGradient>
      </defs>
      <g>
        <path
          d="M12 3l2 5.4 5.4 2-5.4 2-2 5.6-2-5.6-5.4-2 5.4-2z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--ink))"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="18.4" cy="6.2" r="1.5" fill="hsl(var(--accent))" opacity="0.85" />
        <circle cx="6" cy="7.2" r="1.1" fill="hsl(var(--secondary))" opacity="0.7" />
        <path
          d="M5 17.5h6.2"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.6 1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const SendIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-send-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M3.5 4.4l16.8 7.4-16.8 7.4 5.8-7.4z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M9.3 11.8l10.5-.9-10.5-.9"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M7.3 7.2l2.4 2.4"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const UserIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-user-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <circle cx="12" cy="8" r="4.1" fill={`url(#${fillId})`} stroke="hsl(var(--ink))" strokeWidth="1.2" />
        <path
          d="M5.4 18.1c1.6-3.4 4.1-5.2 6.6-5.2 2.6 0 5.2 1.8 6.7 5.2"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <rect x="7.2" y="15" width="9.6" height="4.3" rx="2" fill="hsl(var(--card))" opacity="0.72" />
        <path
          d="M14.4 6.2l3 1.6-1.4 1.2"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const CheckCircleIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-check-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <radialGradient id={fillId} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </radialGradient>
      </defs>
      <g>
        <circle cx="12" cy="12" r="9" fill={`url(#${fillId})`} stroke="hsl(var(--primary-foreground))" strokeWidth="1.4" />
        <path
          d="M7.5 12l3.2 3.2 5.6-6.3"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.6 7.6l2-2.2 2 1.4"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const PaperAirplaneIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-paper-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M3.5 11.7L19.8 4 14 20l-3.4-5.1-3.3 3.8z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M10.6 14.9l4.8-7.8"
          stroke="hsl(var(--ink))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M7.3 10.4l2.6.9"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const FolderIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-folder-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M4 6.2c0-1.1.9-2 2-2h3.7l1.9 2.4h8.4c1.1 0 2 .9 2 2V17c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M4 9.2h16"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M6.4 12.2h5.2"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.8 1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const Cog6ToothIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-cog-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </radialGradient>
      </defs>
      <g>
        <path
          d="M12 4l2.1 1.3 2.4-.5 1 2.2 2 1-1 2.2 1 2.2-2 1-1 2.2-2.4-.5L12 20l-2.1-1.3-2.4.5-1-2.2-2-1 1-2.2-1-2.2 2-1 1-2.2 2.4.5z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.7" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1.2" />
        <path
          d="M9 7.6l2.2-2.5 2.4 1.4"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const MagicWandIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-wand-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M9.8 4l1.4 2.8 3.1.6-2.5 2.1.6 3.2-2.6-1.5-2.8 1.5.8-3-2.3-2 3.2-.4z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--ink))"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M5 18.4l8.2-7.9"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M7.4 20.6l9.4-9"
          stroke="hsl(var(--card))"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="1.8 1.2"
        />
        <circle cx="16.9" cy="6.2" r="1.4" fill="hsl(var(--accent))" opacity="0.8" />
      </g>
    </svg>
  );
};

export const ChevronDownIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const strokeId = `${gradientId}-chevron-down`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={strokeId} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M6 9.5l6 6 6-6"
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.2 7.4h11.6"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.6 1.2"
        />
      </g>
    </svg>
  );
};

export const ChevronUpIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const strokeId = `${gradientId}-chevron-up`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={strokeId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M6 14.5l6-6 6 6"
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.2 16.6h11.6"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.6 1.2"
        />
      </g>
    </svg>
  );
};

export const PlayIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-play-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <circle cx="12" cy="12" r="9" fill={`url(#${fillId})`} stroke="hsl(var(--primary-foreground))" strokeWidth="1.4" />
        <path
          d="M10.1 8.3l5.5 3.7-5.5 3.7z"
          fill="hsl(var(--card))"
          stroke="hsl(var(--ink))"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M6.4 6.6l2-2.2 2.1 1.3"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const PencilIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-pencil-fill`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M4.6 5.4c0-1.1.9-2 2-2H13l2 2h3.4c1.1 0 2 .9 2 2v11.3c0 1.1-.9 2-2 2H6.6c-1.1 0-2-.9-2-2z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M12.2 4.2l5.8 5.8-3.8 3.8-5.8-5.8z"
          fill="hsl(var(--card))"
          stroke="hsl(var(--ink))"
          strokeWidth="1.2"
        />
        <path
          d="M8 16.4l2.4-.7"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M6.4 7h6"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.6 1.2"
        />
      </g>
    </svg>
  );
};

export const XMarkIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const strokeId = `${gradientId}-xmark`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--destructive))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M6 6l12 12M18 6L6 18"
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M4.6 4.8l2-2.2 2 1.3"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const TrashIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-trash`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="5.4"
          y="7.6"
          width="13.2"
          height="12.2"
          rx="2.2"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.4"
        />
        <path
          d="M4 7.6h16"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M9.2 4.6l1.2-1.6h3.2l1.2 1.6"
          fill="none"
          stroke="hsl(var(--secondary-foreground))"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.6 10.4v6.2M13.4 10.4v6.2"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M7 14.4h10"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.6 1"
        />
      </g>
    </svg>
  );
};

export const RocketLaunchIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-rocket`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M12 3c3 1.2 5.4 4.6 5.4 7.8 0 3.2-2.4 5.6-5.4 5.6s-5.4-2.4-5.4-5.6C6.6 7.6 9 4.2 12 3z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
        />
        <circle cx="12" cy="9.6" r="1.6" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1" />
        <path
          d="M8.2 14.4l-1 4 2.4-1.2M15.8 14.4l1 4-2.4-1.2"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M10.2 18.6l1.8 3 1.8-3"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M6.6 6.4l2-2.2 2.1 1.2"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const StoryboardIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const topId = `${gradientId}-story-top`;
  const panelId = `${gradientId}-story-panel`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={topId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
        <linearGradient id={panelId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M4.4 6.2L14.8 3l4.8 3.2v11L9.2 20.4l-4.8-3.2z"
          fill={`url(#${topId})`}
          stroke="hsl(var(--ink))"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M4.4 9.4l10.4-2.9v7.4L4.4 16.8z"
          fill={`url(#${panelId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M6 10.8h4.4v3.1H6zM11.4 9.4h3.4v3H11.4z"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
        />
        <path
          d="M16 12.4c1.4-.7 3.1.3 3.1 1.9 0 .9-.5 1.7-1.3 2.1l.5 2.1-2.5-1.5c-1.4.2-2.8-1-2.8-2.6 0-1.2.7-2.2 1.6-2.5z"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const TimelinePanelsIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const frameId = `${gradientId}-timeline-frame`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={frameId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="3.6"
          y="5"
          width="16.8"
          height="14"
          rx="2.4"
          fill={`url(#${frameId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.3"
        />
        <path
          d="M5.4 9.4h13.2"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <rect x="6.4" y="6.4" width="3.2" height="2.4" rx="0.8" fill="hsl(var(--card))" />
        <rect x="11" y="6.4" width="3.2" height="2.4" rx="0.8" fill="hsl(var(--accent))" opacity="0.9" />
        <rect x="15.6" y="6.4" width="3.2" height="2.4" rx="0.8" fill="hsl(var(--card))" opacity="0.8" />
        <path
          d="M6.4 12.6h10.8"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.8 1.2"
          strokeLinecap="round"
        />
        <path
          d="M6.4 15.8h7.6"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M15 15.8l2.2 1.8"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const AssetCrateIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-crate`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="4.2"
          y="6"
          width="15.6"
          height="12.8"
          rx="2.4"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.3"
        />
        <path
          d="M6 8.8h12"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M6 12h12"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeDasharray="1.8 1.2"
          strokeLinecap="round"
        />
        <path
          d="M6 15.2h12"
          stroke="hsl(var(--card))"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M8.2 7l3-2.8 3 2.8"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13.6" r="1.4" fill="hsl(var(--card))" stroke="hsl(var(--primary-foreground))" strokeWidth="0.9" />
      </g>
    </svg>
  );
};

export const RobotAssistantIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const headId = `${gradientId}-robot-head`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={headId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="5"
          y="6"
          width="14"
          height="12"
          rx="3"
          fill={`url(#${headId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.3"
        />
        <path
          d="M8 4l2.2-1.8 1.8 1.8"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="11.2" r="1.6" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1" />
        <circle cx="14.5" cy="11.2" r="1.6" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1" />
        <path
          d="M9.5 15.2h5"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M5 12.4H3.4M18.6 12.4H21"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M7.4 18.4l2 2 2.6-2"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const DramaMasksIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const happyId = `${gradientId}-mask-happy`;
  const sadId = `${gradientId}-mask-sad`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={happyId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
        <linearGradient id={sadId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M5 5.6l6.4-1.6v8.4c0 2.7-1.6 4.8-4 5.6-1.8.6-3.8-.6-3.8-2.6z"
          fill={`url(#${happyId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
        />
        <path
          d="M9.2 9.2l-1.1 1.2M6.6 9.2l-1.1 1.2"
          stroke="hsl(var(--ink))"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <path
          d="M6 12.6c.7.6 1.6 1 2.6 1s1.9-.4 2.6-1"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M12.6 6.6l6.4-1.6V13c0 2.7-1.6 4.8-4 5.6-1.8.6-3.8-.6-3.8-2.6z"
          fill={`url(#${sadId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.2"
        />
        <path
          d="M16.8 10.2l1.2 1.1M14.2 10.2l1.2 1.1"
          stroke="hsl(var(--ink))"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <path
          d="M14 13.4c.7-.6 1.6-1 2.6-1s1.9.4 2.6 1"
          fill="none"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const PalettePanelIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const fillId = `${gradientId}-palette`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={fillId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M5 6.2c0-1.2 1-2.2 2.2-2.2h9.6c1.2 0 2.2 1 2.2 2.2v6.6c0 1.2-1 2.2-2.2 2.2h-1.8l-2.4 2.2-.4-2.2H7.2c-1.2 0-2.2-1-2.2-2.2z"
          fill={`url(#${fillId})`}
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="8.6" r="1.1" fill="hsl(var(--card))" />
        <circle cx="12" cy="8.6" r="1.1" fill="hsl(var(--card))" />
        <circle cx="15" cy="8.6" r="1.1" fill="hsl(var(--card))" />
        <path
          d="M7.4 12.2h8.6"
          stroke="hsl(var(--card))"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M9.6 15.8l2.4 1.8 2.6-1.8"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const PlusIcon: React.FC<IconProps> = ({ className, title }) => {
  const gradientId = React.useId();
  const strokeId = `${gradientId}-plus`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      focusable="false"
      {...getAccessibilityProps(title)}
    >
      {renderTitle(title)}
      <defs>
        <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M12 5v14M5 12h14"
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

