# Build stage
FROM golang:alpine AS builder

WORKDIR /app

# 依存パッケージキャッシュ
COPY go.mod go.sum ./
RUN go mod download

# ソースコードコピー & ビルド
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /goipam-server .

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# iputils (ping) と ca-certificates の導入
RUN apk add --no-cache ca-certificates tzdata iputils

# バイナリの配置
COPY --from=builder /goipam-server /app/goipam-server

# 非特権pingの実行パーミッション
RUN chmod +s /bin/ping || true

EXPOSE 8080

CMD ["/app/goipam-server"]

