"""Run the current Arcadia Planitia API integration checks."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('arcadia-api-smoke.py')),run_name='__main__')
runpy.run_path(str(Path(__file__).with_name('environment-api-smoke.py')),run_name='__main__')
runpy.run_path(str(Path(__file__).with_name('directions-api-smoke.py')),run_name='__main__')
runpy.run_path(str(Path(__file__).with_name('intelligence-api-smoke.py')),run_name='__main__')
