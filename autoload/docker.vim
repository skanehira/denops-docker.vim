function! docker#command(cmd) abort
  call denops#notify("docker", "customCommand", [a:cmd])
endfunction

" cached container names
let s:containers = []

function! docker#listContainer(argLead, l, p) abort
  if a:argLead == "" || len(s:containers) == 0
    let s:containers = denops#request("docker", "listContainer", [])
  endif
  return filter(s:containers, { _, v -> v =~# printf(".*%s.*", a:argLead)})
endfunction

function! docker#attachContainer(name) abort
  let s:containers = []
  call denops#notify("docker", "containerAttach", [a:name])
endfunction

function! docker#showContainerLog(name) abort
  let s:containers = []
  call denops#notify("docker", "tailContainerLogs", [a:name])
endfunction
