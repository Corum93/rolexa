// Retired safety shim.
// Interview invitations are now rendered directly by candidate-messaging-inbox.js.
// Keeping this file as a no-op prevents cached dashboard sessions from starting the old MutationObserver loop.
(() => {
  window.__rolexaCandidateInterviewInvitations = true;
})();
