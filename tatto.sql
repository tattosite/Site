CREATE TABLE usuarios (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'usuario'
        CHECK (cargo IN ('usuario', 'administrador'))
);

CREATE TABLE estilos_tatuagem (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT
);

CREATE TABLE servicos (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_base NUMERIC(10, 2) NOT NULL CHECK (preco_base >= 0)
);

CREATE TABLE agendamentos (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome_cliente TEXT NOT NULL,
    ideia_tatuagem TEXT NOT NULL,
    data_agendamento DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente'
        CHECK (status IN ('Pendente', 'Confirmado', 'Concluído', 'Cancelado')),
    estilo_id INT,
    servico_id INT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (estilo_id) REFERENCES estilos_tatuagem(id),
    FOREIGN KEY (servico_id) REFERENCES servicos(id)
);

INSERT INTO usuarios (nome, email, senha, cargo) VALUES
('Administrador', 'admin@andersonstudio.com', 'TROCAR_POR_HASH_SEGURO', 'administrador'),
('Mariana Costa', 'mariana@email.com', 'TROCAR_POR_HASH_SEGURO', 'usuario'),
('Lucas Almeida', 'lucas@email.com', 'TROCAR_POR_HASH_SEGURO', 'usuario');

INSERT INTO estilos_tatuagem (nome, descricao) VALUES
('Traço fino', 'Traços finos, delicados e minimalistas.'),
('Tatuagem preta sólida', 'Desenhos com áreas de tinta preta e alto contraste.'),
('Autoral', 'Projeto personalizado criado a partir da ideia do cliente.');

INSERT INTO servicos (nome, descricao, preco_base) VALUES
('Tatuagem pequena', 'Tatuagem de pequeno porte, sujeita à avaliação do artista.', 150.00),
('Tatuagem média', 'Tatuagem de porte médio, sujeita à avaliação do artista.', 300.00);

INSERT INTO agendamentos
    (usuario_id, nome_cliente, ideia_tatuagem, data_agendamento, status, estilo_id, servico_id)
VALUES
(2, 'Mariana Costa', 'Flor delicada no antebraço', '2026-11-10', 'Pendente', 1, 1),
(3, 'Lucas Almeida', 'Desenho geométrico no braço', '2026-11-12', 'Confirmado', 2, 2);
