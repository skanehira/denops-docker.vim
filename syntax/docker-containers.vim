hi! DockerContainerHeader ctermfg=216 guifg=#e2a478 cterm=underline,bold
hi! DockerContainerUp ctermfg=10 guifg=#b4be82
hi! DockerContainerExitedError ctermfg=203 ctermbg=234 guifg=#e27878 guibg=#161821

syntax match DockerContainerUp /.*\sUp.*/
syntax match DockerContainerHeader /^ID.*/
syntax match DockerContainerExitedError /.*\sExited ([^0]\+).*/
