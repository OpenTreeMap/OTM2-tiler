all:
	npm install

clean:
	rm -rf node_modules/*

check:
	npm test

test: check

docs:
	docco ./*.js
