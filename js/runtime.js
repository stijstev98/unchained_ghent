/* Shared runtime.
   Systems read and write the same bindings through __tram so startup
   stays in the original order without a bundle step.
   Only js/run.js should call __tram.__inits. */
export const T = window.THREE;
export const $ = (id) => document.getElementById(id);
export const __tram = { __inits: [] };
