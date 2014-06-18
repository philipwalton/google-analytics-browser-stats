mods := ./node_modules
bins := ./node_modules/.bin
src := bin/* lib/*
test := test/*

all: install lint

install:
	@ npm install

lint: $(src) $(test)
	@ $(bins)/jshint --verbose $^

test: $(test)
	$(bins)/mocha --reporter spec

.PHONY: all install lint
