; Hooks for Tauri's NSIS installer (bundle.windows.nsis.installerHooks).
;
; Puts porter, the terminal version installed next to Porter.exe, on this
; user's PATH, and takes it off again on uninstall. porter edits the registry
; itself: NSIS's own string functions stop at 1024 characters, and a PATH
; written back through them is cut short. The setting "Command line tool" in
; the app does the same, so people can change their mind later.

!macro NSIS_HOOK_POSTINSTALL
  nsExec::Exec '"$INSTDIR\porter.exe" path add'
  Pop $0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec '"$INSTDIR\porter.exe" path remove'
  Pop $0
!macroend
