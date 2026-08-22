export interface PinTag {
  id: string;
  number: number;
  x: number; // Normalized 0-1 position on image
  y: number; // Normalized 0-1 position on image
  label: string;
  aiSuggestions: string[];
  thumbnailUrl: string; // Cropped area around pin
  imageObjectId: string; // Fabric object ID
  isIdentifying?: boolean;
}
