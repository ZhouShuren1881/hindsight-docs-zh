import React, {type ComponentProps} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

/** MDX media paths are resolved against the configured deployment directory. */
export function StaticImage({src, ...props}: ComponentProps<'img'>) {
  const resolvedSrc = useBaseUrl(src ?? '');
  return <img {...props} src={src ? resolvedSrc : undefined} />;
}

export function StaticVideo({src, poster, ...props}: ComponentProps<'video'>) {
  const resolvedSrc = useBaseUrl(src ?? '');
  const resolvedPoster = useBaseUrl(poster ?? '');
  return (
    <video
      {...props}
      src={src ? resolvedSrc : undefined}
      poster={poster ? resolvedPoster : undefined}
    />
  );
}

export function StaticSource({src, ...props}: ComponentProps<'source'>) {
  const resolvedSrc = useBaseUrl(src ?? '');
  return <source {...props} src={src ? resolvedSrc : undefined} />;
}
