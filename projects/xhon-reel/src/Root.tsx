import {Composition} from 'remotion';
import {Reel} from './Reel';
import {f, TL} from './timeline';

export const Root = () => (
  <Composition id="XhonReel" component={Reel} durationInFrames={f(TL.duration)} fps={TL.fps} width={1080} height={1920} />
);
