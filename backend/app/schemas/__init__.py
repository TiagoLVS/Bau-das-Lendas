from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Literal


class CulturalReview(BaseModel):
    estado: Literal['parcial', 'pendente']
    resumo: Literal['adaptado_do_texto', 'extrativo_do_texto', 'pendente']


class CulturalContent(BaseModel):
    model_config = ConfigDict(extra='forbid')
    pais: str | None = None
    codigoPais: str | None = None
    regiao: str = ''
    tradicao: str | None = None
    tipoNarrativa: str = 'pendente'
    resumoEducativo: str | None = None
    contextoCultural: str | None = None
    curiosidades: list[str] = Field(default_factory=list)
    revisao: CulturalReview

    @field_validator('pais', 'codigoPais', 'regiao', 'tradicao', 'tipoNarrativa', 'resumoEducativo', 'contextoCultural', 'curiosidades')
    @classmethod
    def plain_text(cls, value):
        import re
        values = value if isinstance(value, list) else [value]
        if any(v and re.search(r'<\s*/?\s*[a-zA-Z!]', v) for v in values):
            raise ValueError('Conteúdo cultural deve ser texto simples, sem HTML.')
        return value


class LegendOut(BaseModel):
    # Atributos antigos continuam presentes; cultura é uma extensão opcional.
    model_config = ConfigDict(extra='allow')
    id: str
    numero: int
    nome: str
    origem: str
    historia: str
    imagem: str
    cultura: CulturalContent | None = None


class Login(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=10, max_length=128)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class Register(Login):
    username: str = Field(min_length=2, max_length=80)

    @field_validator('username')
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Nome precisa ter ao menos dois caracteres.')
        return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    email: str


class EmptyDraw(BaseModel):
    model_config = ConfigDict(extra='forbid')
