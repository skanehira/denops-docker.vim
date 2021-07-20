.PHOY: coverage
export TZ=Asia/Tokyo

coverage:
	@deno test --allow-all --unstable --coverage=cov
	@deno coverage cov
	@rm -rf cov
test:
	@docker network create denops-docker-mock
	@docker run --rm -v ${PWD}:/mock --name denops-docker-mock --net denops-docker-mock -p 9999:4010 -d stoplight/prism mock -h 0.0.0.0 /mock/swagger.yaml
	@docker run --rm --net denops-docker-mock jwilder/dockerize -timeout 180s -wait http://denops-docker-mock:4010/containers/json && deno test --allow-all --unstable
	@docker kill denops-docker-mock && docker network remove denops-docker-mock
