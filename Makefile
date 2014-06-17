mods := ./node_modules
bins := ./node_modules/.bin
src := bin/* lib/*
# test := test/*

all: install lint

install:
	@ npm install

lint: $(src)
	@ $(bins)/jshint --verbose $^

.PHONY: all install lint
