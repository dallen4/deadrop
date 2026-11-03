// VS Code renders `[label](command:...)` in notification text as a
// clickable link that runs the command. Messages can carry peer- or
// sharer-authored text, so break that syntax before showing them.
export const plainNotification = (message: string) =>
  message.replace(/\]\(/g, '] (');
