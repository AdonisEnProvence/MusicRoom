#!/bin/bash

set -eux -o pipefail

# === Auto setup defaults ===

DB="${DB:-cassandra}"
SKIP_SCHEMA_SETUP="${SKIP_SCHEMA_SETUP:-false}"

# Cassandra
KEYSPACE="${KEYSPACE:-temporal}"
# VISIBILITY_KEYSPACE="${VISIBILITY_KEYSPACE:-temporal_visibility}"

CASSANDRA_SEEDS="${CASSANDRA_SEEDS:-}"
CASSANDRA_PORT="${CASSANDRA_PORT:-9042}"
CASSANDRA_USER="${CASSANDRA_USER:-}"
CASSANDRA_PASSWORD="${CASSANDRA_PASSWORD:-}"
CASSANDRA_TLS_ENABLED="${CASSANDRA_TLS_ENABLED:-}"
CASSANDRA_CERT="${CASSANDRA_CERT:-}"
CASSANDRA_CERT_KEY="${CASSANDRA_CERT_KEY:-}"
CASSANDRA_CA="${CASSANDRA_CA:-}"
CASSANDRA_REPLICATION_FACTOR="${CASSANDRA_REPLICATION_FACTOR:-1}"

# MySQL/PostgreSQL
DBNAME="${DBNAME:-temporal}"
# VISIBILITY_DBNAME="${VISIBILITY_DBNAME:-temporal_visibility}"
DB_PORT="${DB_PORT:-3306}"

MYSQL_SEEDS="${MYSQL_SEEDS:-}"
MYSQL_USER="${MYSQL_USER:-}"
MYSQL_PWD="${MYSQL_PWD:-}"
MYSQL_TX_ISOLATION_COMPAT="${MYSQL_TX_ISOLATION_COMPAT:-false}"

POSTGRES_SEEDS="${POSTGRES_SEEDS:-}"
POSTGRES_USER="${POSTGRES_USER:-}"
POSTGRES_PWD="${POSTGRES_PWD:-}"
# Don't create the DB instance
SKIP_POSTGRES_DB_CREATION="${SKIP_POSTGRES_DB_CREATION:-false}"

# Elasticsearch
ENABLE_ES="${ENABLE_ES:-false}"
ES_SCHEME="${ES_SCHEME:-http}"
ES_SEEDS="${ES_SEEDS:-}"
ES_PORT="${ES_PORT:-9200}"
ES_USER="${ES_USER:-}"
ES_PWD="${ES_PWD:-}"
ES_VERSION="${ES_VERSION:-v7}"
# ES_VIS_INDEX="${ES_VIS_INDEX:-temporal_visibility_v1_dev}"
ES_SCHEMA_SETUP_TIMEOUT_IN_SECONDS="${ES_SCHEMA_SETUP_TIMEOUT_IN_SECONDS:-0}"

# Server setup
TEMPORAL_CLI_ADDRESS="${TEMPORAL_CLI_ADDRESS:-}"

SKIP_DEFAULT_NAMESPACE_CREATION="${SKIP_DEFAULT_NAMESPACE_CREATION:-false}"
DEFAULT_NAMESPACE="${DEFAULT_NAMESPACE:-default}"
DEFAULT_NAMESPACE_RETENTION=${DEFAULT_NAMESPACE_RETENTION:-1}

SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES="${SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES:-false}"

# === Main database functions ===

validate_db_env() {
    if [ -z "${POSTGRES_SEEDS}" ]; then
        echo "POSTGRES_SEEDS env must be set if DB is ${DB}."
        exit 1
    fi
}

wait_for_postgres() {
    until nc -z "${POSTGRES_SEEDS%%,*}" "${DB_PORT}"; do
        echo 'Waiting for PostgreSQL to startup.'
        sleep 1
    done

    echo 'PostgreSQL started.'
}

wait_for_db() {
    wait_for_postgres
}

setup_postgres_schema() {
    # TODO (alex): Remove exports
    { export SQL_PASSWORD=${POSTGRES_PWD}; } 2> /dev/null

    SCHEMA_DIR=${TEMPORAL_HOME}/schema/postgresql/v96/temporal/versioned
    # Create database only if its name is different from the user name. Otherwise PostgreSQL container itself will create database.
    if [[ "${DBNAME}" != "${POSTGRES_USER}" && "${SKIP_POSTGRES_DB_CREATION}" != true ]]; then
        temporal-sql-tool --plugin postgres --ep "${POSTGRES_SEEDS}" -u "${POSTGRES_USER}" -p "${DB_PORT}" create --db "${DBNAME}"
    fi
    temporal-sql-tool --plugin postgres --ep "${POSTGRES_SEEDS}" -u "${POSTGRES_USER}" -p "${DB_PORT}" --db "${DBNAME}" setup-schema -v 0.0
    temporal-sql-tool --plugin postgres --ep "${POSTGRES_SEEDS}" -u "${POSTGRES_USER}" -p "${DB_PORT}" --db "${DBNAME}" update-schema -d "${SCHEMA_DIR}"
}

setup_schema() {
    echo 'Setup PostgreSQL schema.'
    setup_postgres_schema
}

# === Server setup ===

register_default_namespace() {
    echo "Registering default namespace: ${DEFAULT_NAMESPACE}."
    if ! tctl --ns "${DEFAULT_NAMESPACE}" namespace describe; then
        echo "Default namespace ${DEFAULT_NAMESPACE} not found. Creating..."
        tctl --ns "${DEFAULT_NAMESPACE}" namespace register --rd "${DEFAULT_NAMESPACE_RETENTION}" --desc "Default namespace for Temporal Server."
        echo "Default namespace ${DEFAULT_NAMESPACE} registration complete."
    else
        echo "Default namespace ${DEFAULT_NAMESPACE} already registered."
    fi
}

# add_custom_search_attributes() {
#       echo "Adding Custom*Field search attributes."
#       # TODO: Remove CustomStringField
# # @@@SNIPSTART add-custom-search-attributes-for-testing-command
#       tctl --auto_confirm admin cluster add-search-attributes \
#           --name CustomKeywordField --type Keyword \
#           --name CustomStringField --type Text \
#           --name CustomTextField --type Text \
#           --name CustomIntField --type Int \
#           --name CustomDatetimeField --type Datetime \
#           --name CustomDoubleField --type Double \
#           --name CustomBoolField --type Bool
# # @@@SNIPEND
# }

setup_server(){
    echo "Temporal CLI address: ${TEMPORAL_CLI_ADDRESS}."

    until tctl cluster health | grep SERVING; do
        echo "Waiting for Temporal server to start..."
        sleep 1
    done
    echo "Temporal server started."

    if [ "${SKIP_DEFAULT_NAMESPACE_CREATION}" != true ]; then
        register_default_namespace
    fi

    # if [ "${SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES}" != true ]; then
    #     add_custom_search_attributes
    # fi
}

# === Main ===

if [ "${SKIP_SCHEMA_SETUP}" != true ]; then
    validate_db_env
    wait_for_db
    setup_schema
fi

# Run this func in parallel process. It will wait for server to start and then run required steps.
setup_server &
