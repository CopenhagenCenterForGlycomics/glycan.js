x11-fixed-bold-7x13.ttf and x11-fixed-regular-7x13.ttf are TrueType
conversions of the X11 core "Fixed" bitmap font (the 7x13 bold and medium
weights), the same bitmap font family libgd's default font functions
(gdFontSmall, gdFontMediumBold, etc.) were originally derived from.

The embedded font metadata carries the original X Consortium notice:

    Public domain font. Share and enjoy.

TTF conversion source: https://github.com/gamache/x11-fonts-ttf
(files: "7x13B-Fixed Bold.ttf", "7x13-Fixed.ttf")

x11-fixed-regular-7x13.ttf is subsetted from the original "7x13-Fixed.ttf"
down to just the characters linkage labels render (0-9, the anomer symbols
α/β, '?', 'N', 'O') via subset-font (https://github.com/papandreou/subset-font,
an hb-subset/HarfBuzz wasm build) - the unsubsetted file carries much
broader Unicode coverage than the bold weight needs for residue names
alone. Re-subset from the original if more characters are ever needed.
