function! docker#command(cmd) abort
  call denops#notify("docker", "customCommand", [a:cmd])
endfunction

