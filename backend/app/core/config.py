from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"
    github_token: str = ""
    github_repo: str = ""

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
