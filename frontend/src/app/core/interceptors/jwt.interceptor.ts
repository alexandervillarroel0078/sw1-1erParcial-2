import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

const DPN_TOKEN_KEY = 'dpn_token';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = localStorage.getItem(DPN_TOKEN_KEY) ?? '';
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
