import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

const FACES: [string, string, string][] = [
  ['Heebo', 'Heebo-hebrew-0.woff2', 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F'],
  ['Heebo', 'Heebo-latin-1.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['Rubik', 'Rubik-hebrew-2.woff2', 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F'],
  ['Rubik', 'Rubik-latin-3.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['Space Grotesk', 'SpaceGrotesk-latin-4.woff2', 'U+0000-00FF, U+2000-206F, U+20AC, U+20AA'],
];

/** Registers the bundled variable fonts and holds the render until they load. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(
      FACES.map(([family, file, range]) => {
        const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight: '300 900', unicodeRange: range});
        document.fonts.add(face);
        return face.load();
      }),
    )
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
};
