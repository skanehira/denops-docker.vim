.PHOY: coverage
coverage:
	@deno test --allow-all --unstable --coverage=cov
	@deno coverage cov
	@rm -rf cov
test:
	@docker run --rm -it -v ${PWD}:/mock --name denops-docker-mock -p 9999:4010 -d stoplight/prism mock -h 0.0.0.0 /mock/swagger.yaml
	@docker run --rm -it jwilder/dockerize -timeout 15s -wait http://host.docker.internal:9999/containers/json && deno test --allow-all --unstable
	@docker kill denops-docker-mock
