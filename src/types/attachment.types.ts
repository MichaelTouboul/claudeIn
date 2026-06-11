/** Which native file-picker dialog to open for an attachment action.
 *  `all` → unfiltered picker (any file); `image` → picker scoped to image types. */
export const FilePickerKind = { All: 'all', Image: 'image' } as const;
export type FilePickerKind = (typeof FilePickerKind)[keyof typeof FilePickerKind];
