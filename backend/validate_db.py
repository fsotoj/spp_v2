import sys
import logging
from sqlmodel import Session, select
from db.session import engine
from db.models import Observation, VariableDictionary, Country, State

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("validate_db")

def validate():
    logger.info("Starting database validation...")
    try:
        with Session(engine) as session:
            # Check if tables exist and have data
            countries = session.exec(select(Country)).first()
            states = session.exec(select(State)).first()
            variables = session.exec(select(VariableDictionary)).first()
            observations = session.exec(select(Observation)).first()

            checks = {
                "Countries": countries,
                "States": states,
                "Variables": variables,
                "Observations": observations
            }

            failed = False
            for name, result in checks.items():
                if result is None:
                    logger.error(f"Table '{name}' is empty or missing!")
                    failed = True
                else:
                    logger.info(f"Table '{name}' verified.")

            if failed:
                logger.error("Database validation FAILED.")
                sys.exit(1)
            
            logger.info("Database validation PASSED.")
            sys.exit(0)

    except Exception as e:
        logger.error(f"Database validation unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    validate()
