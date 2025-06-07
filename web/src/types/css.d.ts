/**
 * CSS Module Type Declarations
 */

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}

declare module '*.sass' {
  const content: string;
  export default content;
}

declare module '*.less' {
  const content: string;
  export default content;
}

// Mantine CSS imports
declare module '@mantine/core/styles.css';
declare module '@mantine/dates/styles.css';
declare module '@mantine/notifications/styles.css';
declare module '@mantine/spotlight/styles.css';
declare module '@mantine/dropzone/styles.css';
declare module '@mantine/carousel/styles.css';
declare module '@mantine/nprogress/styles.css';
declare module '@mantine/prism/styles.css';
