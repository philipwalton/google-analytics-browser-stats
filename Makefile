mods := ./node_modules
bins := ./node_modules/.bin
src := bin/* lib/*.js
test := test/*.js

all: install lint test

install:
	@ npm install

lint: $(src) $(test)
	@ $(bins)/jshint --verbose $^

test: $(test)
	@ $(bins)/mocha --reporter spec

.PHONY: all install lint test
