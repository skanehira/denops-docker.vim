hi! DockerContainerHeader ctermfg=216 guifg=#e2a478 cterm=underline,bold
hi! DockerContainerUp ctermfg=107 guifg=#a0c980
hi! DockerContainerExitedError cterm=bold ctermfg=203 gui=bold guifg=#ec7279

syntax match DockerContainerUp /.*\sUp.*/
syntax match DockerContainerHeader /^ID.*/
syntax match DockerContainerExitedError /.*\sExited ([^0]\+).*/
