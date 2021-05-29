.PHOY: coverage
coverage:
	@deno test --allow-all --unstable --no-check --coverage=cov
	@deno coverage cov
	@rm -rf cov
test:
	@deno test --allow-all --unstable --no-check
