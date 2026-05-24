.PHONY: help install dev-chat dev-todo dev-python build-chat build-todo deploy-chat deploy-todo

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Setup:"
	@echo "  install          Install all dependencies"
	@echo "  install-chat     Install ai-chat dependencies"
	@echo "  install-todo     Install todo-next dependencies"
	@echo "  install-python   Install Python dependencies"
	@echo ""
	@echo "Development:"
	@echo "  dev-chat         Start ai-chat dev server (localhost:3000)"
	@echo "  dev-todo         Start todo-next dev server (localhost:3000)"
	@echo "  dev-python       Start Python todo API server (localhost:8000)"
	@echo ""
	@echo "Build:"
	@echo "  build-chat       Build ai-chat for production"
	@echo "  build-todo       Build todo-next for production"
	@echo ""
	@echo "Test:"
	@echo "  test             Run todo-next tests"
	@echo "  test-watch       Run todo-next tests in watch mode"
	@echo ""
	@echo "Deploy:"
	@echo "  deploy-chat      Deploy ai-chat (Vercel)"
	@echo "  deploy-todo      Deploy todo-next (Vercel)"

# ----- Setup -----

install: install-chat install-todo install-python

install-chat:
	cd ai-chat && npm install

install-todo:
	cd todo-next && npm install

install-python:
	pip install -r requirements.txt

# ----- Development -----

dev-chat:
	cd ai-chat && npm run dev

dev-todo:
	cd todo-next && npm run dev

dev-python:
	cd todo && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# ----- Build -----

build-chat:
	cd ai-chat && npm run build

build-todo:
	cd todo-next && npm run build

# ----- Test -----

test:
	cd todo-next && npm test

test-watch:
	cd todo-next && npm run test:watch

# ----- Deploy -----

deploy-chat:
	cd ai-chat && npx vercel --prod

deploy-todo:
	cd todo-next && npx vercel --prod
