FROM python:3.12-slim

WORKDIR /app

ENV UV_PROJECT_ENVIRONMENT=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

COPY app/ app/

CMD ["uvicorn", "app.main:app", "--reload", "--reload-dir", "/app/app", "--host", "0.0.0.0", "--port", "8000"]
