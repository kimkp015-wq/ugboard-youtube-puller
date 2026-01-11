// src/config.ts

export interface YouTubeChannel {
  id: string        // Replace with actual channel ID from YouTube
  name: string
}

// -------------------------
// Mainstream Ugandan Artists
// -------------------------
export const MAIN_ARTISTS: YouTubeChannel[] = [
  { id: "CHANNEL_ID_EDDY_KENZO", name: "Eddy Kenzo" }, // 2.76M
  { id: "CHANNEL_ID_MASAKA_KIDS", name: "Masaka Kids Afrikana" }, // 4.47M
  { id: "CHANNEL_ID_TRIPLETS_GHETTO", name: "Triplets Ghetto Kids" }, // 2.1M
  { id: "CHANNEL_ID_SHEEBAH", name: "Sheebah Karungi" }, // 816K
  { id: "CHANNEL_ID_CHAMELEONE", name: "Jose Chameleone" }, // 777K
  { id: "CHANNEL_ID_SPICE_DIANA", name: "Spice Diana" }, // 646K
  { id: "CHANNEL_ID_DAVID_LUTALO", name: "David Lutalo" }, // 539K
  { id: "CHANNEL_ID_JEHOVAH_SHALOM", name: "Jehovah Shalom A Capella" }, // 514K
  { id: "CHANNEL_ID_PALLASO", name: "Pallaso" }, // 505K
  { id: "CHANNEL_ID_BOBI_WINE", name: "Bobi Wine" }, // 447K
  { id: "CHANNEL_ID_RADIO_WEASEL", name: "Radio & Weasel Goodlyfe" }, // 423K
  { id: "CHANNEL_ID_BEBE_COOL", name: "Bebe Cool" }, // 394K
  { id: "CHANNEL_ID_YKEE_BENDA", name: "Ykee Benda" }, // 317K
  { id: "CHANNEL_ID_B2C", name: "B2C Entertainment" }, // 290K
  { id: "CHANNEL_ID_FIK_FAMEICA", name: "Fik Fameica" }, // 287K
  { id: "CHANNEL_ID_KING_SAHA", name: "King Saha Official" }, // 257K
  { id: "CHANNEL_ID_PASTOR_WILSON", name: "Pastor Wilson Bugembe" }, // 253K
  { id: "CHANNEL_ID_AZAWI", name: "Azawi" }, // 252K
]

// -------------------------
// Emerging & Genre-Specific Artists
// -------------------------
export const EMERGING_ARTISTS: YouTubeChannel[] = [
  { id: "CHANNEL_ID_JOSHUA_BARAKA", name: "Joshua Baraka" }, // R&B/Afro-fusion
  { id: "CHANNEL_ID_CHOSEN_BECKY", name: "Chosen Becky" }, // R&B
  { id: "CHANNEL_ID_LYDIA_JAZMINE", name: "Lydia Jazmine" }, // R&B/Pop
  { id: "CHANNEL_ID_VINKA", name: "Vinka" }, // Pop/Dancehall
  { id: "CHANNEL_ID_ALIEN_SKIN", name: "Alien Skin Official" }, // Urban/Reggaeton
  { id: "CHANNEL_ID_REMA_NAMAKULA", name: "Rema Namakula" }, // Pop/R&B
  { id: "CHANNEL_ID_JULIANA_KANYOMOZI", name: "Juliana Kanyomozi" }, // Pop/Soul
  { id: "CHANNEL_ID_NANA_NYADIA", name: "Nana Nyadia" }, // Afro-fusion/Soul
]

// -------------------------
// Labels & Music Hubs
// -------------------------
export const LABEL_CHANNELS: YouTubeChannel[] = [
  { id: "CHANNEL_ID_SWANGZ", name: "Swangz Avenue" }, // 381K
  { id: "CHANNEL_ID_BLACK_MARKET", name: "Black Market Afrika" }, // 352K
  { id: "CHANNEL_ID_CAVTON", name: "Cavton Music UG" }, // 313K
]

// -------------------------
// Combine all channels into one export
// -------------------------
export const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  ...MAIN_ARTISTS,
  ...EMERGING_ARTISTS,
  ...LABEL_CHANNELS,
]
