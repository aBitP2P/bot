export const sanitizeMD = (text: any) => {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};