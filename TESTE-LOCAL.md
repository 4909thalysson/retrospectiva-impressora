# Teste local da retrospectiva

Para testar a página antes da divulgação, altere temporariamente `GI_RETROSPECTIVE_RELEASE_AT` em `config-publico.js` para uma data passada:

```js
window.GI_RETROSPECTIVE_RELEASE_AT = "2026-11-24T08:30:00-03:00";
```

Inicie um servidor na pasta do projeto:

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000/acesso.html` e faça o teste. A data passada libera o acesso imediatamente.

## Data planejada

Antes de publicar, restaure a data oficial:

```js
window.GI_RETROSPECTIVE_RELEASE_AT = "2026-12-07T08:30:00-03:00";
```

Não publique a configuração com a data temporária de teste.
