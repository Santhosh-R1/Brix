export const inputLabelStyles = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
};

export const inputPropsStyles = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
};

export const menuItemStyles = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '12px',
  textAlign: 'left',
};

export const buttonStyles = {
  borderRadius: 2,
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: '1px',
  fontSize: '12px',
};

export const paperStyles = {
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'rgba(13, 31, 60, 0.5)',
};

export const tableInputStyle = {
  width: '100%',
  height: '36px',
  padding: '7px 8px',
  boxSizing: 'border-box',
  border: '1px solid var(--mui-palette-divider)',
  borderRadius: '4px',
  background: 'var(--mui-palette-background-default)',
  color: 'var(--mui-palette-text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px',
  textAlign: 'left',
};

export const tableInputActiveStyle = {
  ...tableInputStyle,
  border: '1px solid var(--mui-palette-primary-main)',
};

export const tableInputDisabledStyle = {
  ...tableInputStyle,
  background: 'var(--mui-palette-action-disabledBackground)',
};