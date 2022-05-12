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

function! docker#execContainer(name) abort
  let s:containers = []
  call denops#notify("docker", "containerExec", [a:name])
endfunction

function! docker#containerFiles(lead, line, pos) abort
  if a:line ==# ""
    let path = "/"
  elseif a:line[0] !=# "/"
    return []
  else
    let path = a:line[:a:pos]
  endif
  let s:directories = denops#request("docker", "containerFiles", [s:contianer_name, path])
  return filter(map(s:directories, { _, v -> v.path }),
        \ { _, v -> v =~# "^" .. path .. ".\\+" })
endfunction

function! docker#editContainerFile(name) abort
  let s:containers = []
  let s:contianer_name = a:name
  let fname = input("file: ", "", "customlist,docker#containerFiles")
  if fname ==# ""
    return
  endif
  call denops#notify("docker", "openContainerFile", [a:name, fname])
endfunction
