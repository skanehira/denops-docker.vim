#!/bin/bash
container_api="denops-mock-api"
container_network="denops-mock-net"

function isNetworkExist() {
  id=$(docker network ls --filter name=denops-mock-net --format "{{.ID}}")
  if [ "${id}" != "" ];then
    echo true
  else
    echo false
  fi
}

function isContainerRunning() {
  state=$(docker ps -a -f "name=^${1}$" --format "{{.State}}")
  if [ "${state}" = "running" ]; then
    echo true
  else
    echo false
  fi
}

function isContainerExist() {
  state=$(docker ps -a -f "name=^${1}$" --format "{{.State}}")
  if [ "${state}" != "" ]; then
    echo true
  else
    echo false
  fi
}

function removeContainers() {
  for name in $@; do
    if ! $(isContainerExist $name); then
      continue
    fi
    if $(isContainerRunning $name); then
      docker kill ${name} && sleep 0.5
    fi
    docker rm ${name}
  done
}

function doUp() {
  if ! $(isNetworkExist $container_network); then
    echo "create container network: ${container_network}"
    docker network create ${container_network}
  fi

  if ! $(isContainerExist $container_api); then
    echo "start container: ${container_api}"
    docker run --rm -v ${PWD}:/mock --name ${container_api} \
      --net ${container_network} \
      -p 9999:4010 \
      -d stoplight/prism:4.10.1 mock \
      -h 0.0.0.0 /mock/swagger.yaml
    docker run --rm --net $container_network jwilder/dockerize -timeout 180s -wait http://${container_api}:4010/containers/json
  fi
}

function doDown() {
  if $(isContainerExist $container_api); then
    docker kill ${container_api}
  fi

  if $(isNetworkExist $container_network); then
    docker network rm ${container_network}
  fi
}

function doTest() {
  deno test -A --unstable --coverage=cov .
  exit_code=$?
  if [ ${exit_code} != 0 ]; then
    exit ${exit_code}
  fi
  case $1 in
    cov)
      deno coverage cov
      rm -rf cov
      ;;
    *)
      ;;
  esac
}

function doUpdateDeps() {
  udd denops/docker/deps.ts
}

function usage() {
  cat << EOF
Usage:
  task.sh {action} [{argument}...]

Avaliable action:
  test:run        run tests
  test:cov        run tests and output soverage
  mock:api:up     run docker's mock api container
  mock:api:down   remove docker's mock api container and network
EOF
}

function main() {
  case $1 in
    test:run)
      doUp
      doTest $2
      ;;
    test:cov)
      doUp
      doTest $2 cov
      ;;
    mock:api:up)
      doUp
      ;;
    mock:api:down)
      doDown
      ;;
    deps:update)
      doUpdateDeps
      ;;
    *)
      usage
      ;;
  esac
}

main $@
